# Dynamic Configuration System Implementation

## Overview

This implementation adds a flexible, rule-based configuration system to the auto-deployment feature, allowing administrators to configure operational parameters and staffing rules without code changes.

## Key Features Implemented

### 1. Dynamic Configuration Modal
- **File**: `src/components/DeploymentConfigModal.jsx`
- Pre-assignment configuration prompt for each auto-assignment operation
- Configurable parameters:
  - Drive-through type (DT1, DT2, or None)
  - Number of cooks (0-5)
  - Number of pack stations (0-5)
  - Require shift runner (checkbox)
  - Require manager (checkbox)
- Save configuration as default for future use
- Loads saved defaults automatically

### 2. Rule Management System
- **File**: `src/components/RuleManagementPage.jsx`
- **Navigation**: Added to main menu as "Rule Management"
- Two main tabs:

#### Core Positions Tab
- Define positions that must always be filled
- Configure per position:
  - Priority (1-100)
  - Shift type (Day Shift, Night Shift, Both)
  - Min/Max count
  - Mandatory flag
  - Description
- Activate/Deactivate without deletion
- Full CRUD operations

#### Conditional Rules Tab
- Create flexible conditional staffing rules
- Rule types:
  - Require Position: Add position when condition is met
  - Exclude Position: Remove position from consideration
  - Adjust Count: Change required staff count
  - Custom: Extensible for future logic
- JSON-based condition and action definitions
- Priority-based execution order
- Examples of conditions:
  ```json
  {"dt_type": "DT1"}
  {"num_cooks": {"gte": 2}}
  {"forecast": {"gte": 5000}}
  {"day_of_week": "Saturday"}
  {"and": [{"dt_type": "DT1"}, {"shift_type": "Night Shift"}]}
  ```

### 3. Rule Engine
- **File**: `src/utils/ruleEngine.js`
- Core functions:
  - `getShiftConfiguration()`: Retrieves active configuration
  - `getCorePositions()`: Gets mandatory positions
  - `getConditionalRules()`: Loads active conditional rules
  - `evaluateCondition()`: Evaluates rule conditions against context
  - `applyConditionalRules()`: Applies matching rules to configuration
  - `buildAssignmentContext()`: Builds complete context for assignment
  - `getRequiredPositionsByConfig()`: Calculates required positions
  - `validateConfigurationBeforeAssignment()`: Pre-checks configuration

#### Condition Evaluation
Supports complex conditions:
- Simple equality: `{"dt_type": "DT1"}`
- Comparisons: `{"num_cooks": {"gte": 2}}`
- Logical operators: `and`, `or`, `not`
- Array operations: `in`, `nin`

### 4. Enhanced Intelligent Assignment
- **File**: `src/utils/intelligentDeploymentAssignment.js` (updated)
- Now accepts user configuration as third parameter
- Integrates with rule engine
- Returns additional information:
  - Applied rules list
  - Required positions with sources
  - Configuration used
- Respects excluded positions
- Enforces core position requirements

### 5. Database Schema
- **Migration**: `supabase/migrations/20251014140000_dynamic_configuration_system.sql`

#### New Tables Created:

**shift_configuration_rules**
- Stores operational parameters per shift
- Fields: dt_type, num_cooks, num_pack_stations, require_shift_runner, require_manager
- Supports date-specific configurations
- Extensible via JSON settings field

**core_positions**
- Mandatory positions that must be filled
- Priority-based ordering
- Min/Max count per position
- Shift-specific or both shifts

**conditional_staffing_rules**
- Flexible rule definitions
- JSON-based conditions and actions
- Priority-based execution
- Activate/Deactivate capability

**position_requirements**
- Detailed requirements per position
- Training, sign-off, rating, age requirements
- Links to conditional rules

**configuration_audit_log**
- Complete audit trail for all configuration changes
- Tracks old and new values
- Records user and timestamp
- Automatically populated via triggers

#### Indexes for Performance
- Active configuration lookup
- Date-based queries
- Priority-based sorting
- Audit log searches

## Usage Guide

### For Managers (Using Auto-Assignment)

1. Navigate to Deployments page
2. Click "Auto-Assign Positions" for desired shift
3. Configuration modal appears:
   - Select drive-through type (DT1 requires DT Presenter)
   - Set number of cooks needed
   - Set number of pack stations
   - Toggle shift runner requirement
   - Toggle manager requirement
4. Click "Save as Default" to remember settings (optional)
5. Click "Confirm & Start Auto-Assignment"
6. Review results showing:
   - Successfully assigned staff
   - Skipped staff with reasons
   - Any failed assignments
   - Applied conditional rules

### For Administrators (Managing Rules)

#### Managing Core Positions:
1. Navigate to Rule Management
2. Select "Core Positions" tab
3. Click "Add Core Position"
4. Configure:
   - Select position from dropdown
   - Set priority (lower = higher priority)
   - Choose shift type applicability
   - Set min/max count
   - Mark as mandatory if must be filled
   - Add description
5. Save
6. Use Activate/Deactivate to enable/disable without deletion

#### Creating Conditional Rules:
1. Navigate to Rule Management
2. Select "Conditional Rules" tab
3. Click "Add Rule"
4. Configure:
   - Name the rule descriptively
   - Select rule type
   - Define condition in JSON format
   - Define action in JSON format
   - Set priority for execution order
   - Add description
5. Save

**Example Rule**: "DT1 Requires DT Presenter"
```json
Condition: {"dt_type": "DT1"}
Action: {"require_position": "DT Presenter", "count": 1}
```

**Example Rule**: "Saturday Needs Extra Manager"
```json
Condition: {"day_of_week": "Saturday"}
Action: {"adjust_position_count": {"Manager": 2}}
```

## Technical Architecture

### Configuration Flow:
1. User clicks Auto-Assign
2. Configuration modal loads saved defaults
3. User confirms/modifies configuration
4. System builds assignment context:
   - Loads shift configuration
   - Gets shift info (forecast, etc.)
   - Creates context object
5. Rule engine evaluates:
   - Retrieves all active conditional rules
   - Evaluates conditions against context
   - Applies matching rule actions
6. Required positions calculated:
   - Core mandatory positions
   - DT1-specific positions
   - Cook positions based on count
   - Rule-generated positions
7. Assignment executes:
   - Processes each deployment
   - Finds best position per staff
   - Respects excluded positions
   - Updates database
8. Results displayed with full details

### Extensibility

The system is designed for easy extension:

1. **New Configuration Parameters**: Add to `shift_configuration_rules.additional_settings` JSON field
2. **New Rule Types**: Add to rule_type enum and implement handler in rule engine
3. **New Conditions**: Supported automatically via JSON evaluation
4. **New Position Requirements**: Add to `position_requirements` table
5. **Custom Logic**: Use rule_type 'custom' and implement handler

## Database Maintenance

### Viewing Configuration History:
```sql
SELECT * FROM configuration_audit_log
WHERE table_name = 'shift_configuration_rules'
ORDER BY changed_at DESC;
```

### Finding Active Rules:
```sql
SELECT * FROM conditional_staffing_rules
WHERE is_active = true
ORDER BY priority;
```

### Checking Core Positions:
```sql
SELECT cp.*, p.name as position_name
FROM core_positions cp
JOIN positions p ON cp.position_id = p.id
WHERE cp.is_active = true
ORDER BY cp.priority;
```

## Security

- All tables have Row Level Security (RLS) enabled
- Authenticated users can read all configuration
- Only authenticated users can modify configuration
- Complete audit trail for compliance
- Changes tracked with user and timestamp

## Phases 4, 5, and 6 Completion

### Phase 4: Dynamic Configuration System ✅
- Configuration modal with operational parameters
- Save/load default configurations
- Real-time configuration application

### Phase 5: Rule Management Interface ✅
- Core positions management
- Conditional rules creation
- Activate/deactivate functionality
- Full CRUD operations
- Audit trail

### Phase 6: Intelligent Integration ✅
- Rule engine with condition evaluation
- Automatic position requirement calculation
- Configuration-aware assignment logic
- Excluded position handling
- Enhanced result reporting

## Testing Recommendations

1. **Basic Configuration**:
   - Test DT1 vs DT2 (DT Presenter requirement)
   - Test different cook counts
   - Verify saved defaults persist

2. **Core Positions**:
   - Add mandatory position
   - Verify auto-assignment respects it
   - Test priority ordering

3. **Conditional Rules**:
   - Create DT1 → DT Presenter rule
   - Create Saturday → Extra Manager rule
   - Test rule priority execution

4. **Edge Cases**:
   - No deployments for shift
   - All positions filled
   - Staff without training
   - Conflicting rules

## Future Enhancements

Potential additions for future versions:
1. Time-based rules (peak hours require extra staff)
2. Weather-based rules (rain/snow affects staffing)
3. Event-based rules (holidays, promotions)
4. Multi-store rule sharing
5. Rule templates and presets
6. Visual rule builder (no-code interface)
7. Machine learning for rule suggestions
8. Integration with scheduling software

## Support

For issues or questions:
1. Check configuration audit log for recent changes
2. Verify rule conditions are syntactically correct
3. Ensure positions referenced in rules exist
4. Check that staff have appropriate training for required positions

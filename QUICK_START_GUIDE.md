# Quick Start Guide - Dynamic Configuration System

## For Managers: Using Auto-Assignment

### Basic Usage
1. **Navigate** to Deployments page
2. **Click** "Auto-Assign Positions" for Day or Night shift
3. **Configure** operational parameters:
   - **DT Type**: Select DT1 (requires DT Presenter), DT2 (no presenter), or None
   - **Cooks**: Adjust count (0-5) using +/- buttons
   - **Pack Stations**: Adjust count (0-5) using +/- buttons
   - **Shift Runner**: Check if required
   - **Manager**: Check if required
4. **Save** configuration as default (optional)
5. **Confirm** to start auto-assignment
6. **Review** results and make manual adjustments if needed

### Configuration Tips
- **DT1**: Use when drive-through is in full operation mode (requires presenter)
- **DT2**: Use when drive-through operates with simplified workflow
- **More Cooks**: Increase for busy forecasts or complex menu days
- **Save Default**: Saves time on similar days

---

## For Administrators: Managing Rules

### Quick Access
**Navigation**: Main Menu → Rule Management

### Managing Core Positions

**What are Core Positions?**
Mandatory positions that must always be filled during shifts.

**To Add a Core Position:**
1. Select "Core Positions" tab
2. Click "Add Core Position"
3. Choose position from dropdown
4. Set priority (1 = highest priority)
5. Select shift type (Day, Night, or Both)
6. Set min/max count
7. Check "Mandatory" if position is critical
8. Add description
9. Click "Save"

**Example Core Position:**
- Position: Manager
- Priority: 2
- Shift Type: Both
- Min Count: 1, Max Count: 1
- Mandatory: Yes
- Description: "Every shift requires a manager on duty"

### Creating Conditional Rules

**What are Conditional Rules?**
Rules that automatically apply based on operational conditions.

**To Add a Conditional Rule:**
1. Select "Conditional Rules" tab
2. Click "Add Rule"
3. Enter descriptive rule name
4. Select rule type:
   - **Require Position**: Add a position when condition is met
   - **Exclude Position**: Remove a position from assignment
   - **Adjust Count**: Change number of staff needed
   - **Custom**: For advanced custom logic
5. Define condition in JSON
6. Define action in JSON
7. Set priority (lower = executes first)
8. Add description
9. Click "Save"

**Common Rule Examples:**

**Example 1: DT1 Requires DT Presenter**
```
Rule Name: DT1 Requires DT Presenter
Rule Type: Require Position
Condition: {"dt_type": "DT1"}
Action: {"require_position": "DT Presenter", "count": 1}
Priority: 10
Description: When DT1 is selected, ensure DT Presenter position is filled
```

**Example 2: High Forecast Needs Extra Cook**
```
Rule Name: High Forecast Extra Cook
Rule Type: Adjust Count
Condition: {"forecast": {"gte": 7000}}
Action: {"adjust_position_count": {"Cook": 2}}
Priority: 15
Description: Forecasts over £7,000 require 2 cooks instead of 1
```

**Example 3: Weekend Manager Required**
```
Rule Name: Weekend Manager Required
Rule Type: Require Position
Condition: {"day_of_week": {"in": ["Saturday", "Sunday"]}}
Action: {"require_position": "Manager", "count": 1}
Priority: 5
Description: Weekends always need a manager on duty
```

**Example 4: No Lobby on Night Shift**
```
Rule Name: No Night Lobby
Rule Type: Exclude Position
Condition: {"shift_type": "Night Shift"}
Action: {"exclude_position": "Lobby"}
Priority: 20
Description: Lobby position not used during night shifts
```

### Condition Syntax Guide

**Simple Equality:**
```json
{"dt_type": "DT1"}
{"shift_type": "Day Shift"}
{"day_of_week": "Saturday"}
```

**Comparisons:**
```json
{"num_cooks": {"gte": 2}}          // Greater than or equal
{"forecast": {"lt": 5000}}         // Less than
{"num_pack_stations": {"eq": 2}}   // Equals
```

**Multiple Conditions (AND):**
```json
{"and": [
  {"dt_type": "DT1"},
  {"shift_type": "Night Shift"}
]}
```

**Alternative Conditions (OR):**
```json
{"or": [
  {"day_of_week": "Saturday"},
  {"day_of_week": "Sunday"}
]}
```

**Negation (NOT):**
```json
{"not": {"dt_type": "DT2"}}
```

**Array Membership:**
```json
{"day_of_week": {"in": ["Saturday", "Sunday", "Friday"]}}
{"shift_type": {"nin": ["Day Shift"]}}  // Not in array
```

### Managing Existing Rules

**To Edit a Rule:**
1. Click the pencil icon next to the rule
2. Modify fields as needed
3. Click "Save"

**To Deactivate a Rule (without deleting):**
1. Click "Deactivate" button
2. Rule remains in system but doesn't apply
3. Click "Activate" to re-enable

**To Delete a Rule:**
1. Click the trash icon
2. Confirm deletion
3. Rule is permanently removed (use deactivate instead if unsure)

---

## Troubleshooting

### Configuration Modal Not Showing
- **Check**: Are there deployments for the selected shift?
- **Fix**: Add staff deployments first, then use auto-assign

### Rule Not Applying
- **Check 1**: Is the rule active? Look for "Inactive" label
- **Fix**: Click "Activate" button
- **Check 2**: Is the condition syntax correct?
- **Fix**: Verify JSON format (use online JSON validator)
- **Check 3**: Is the priority too low?
- **Fix**: Increase priority (lower number = higher priority)

### Position Not Being Assigned
- **Check 1**: Does the position exist in the system?
- **Fix**: Add position in Settings if missing
- **Check 2**: Are staff trained for this position?
- **Fix**: Add training records in Training & Ranking
- **Check 3**: Is position capacity exceeded?
- **Fix**: Check position capacity settings

### "No Suitable Position Found" Messages
- **Reason**: Staff member has no training or default positions
- **Fix**: Add training records or default positions for staff member

---

## Best Practices

### For Configuration
1. **Save Defaults**: Save configurations for typical days to save time
2. **Review Results**: Always check auto-assignment results before finalizing
3. **Manual Adjustments**: Use auto-assign as a starting point, refine manually
4. **Consistent Patterns**: Use similar configurations for similar forecast days

### For Rule Management
1. **Start Simple**: Begin with basic rules, add complexity as needed
2. **Test First**: Use "Deactivate" to test impact of removing rules
3. **Document Well**: Use clear descriptions so others understand rules
4. **Priority Matters**: Order rules logically (core requirements first)
5. **Audit Regular**: Review rules quarterly to remove outdated ones

### For System Maintenance
1. **Monitor Usage**: Check which rules apply most frequently
2. **Update Training**: Keep staff training records current
3. **Review Defaults**: Update default configurations as operations change
4. **Backup Rules**: Export important rule configurations
5. **Train Staff**: Ensure all managers understand the configuration system

---

## Support Resources

### Documentation
- **Full Technical Docs**: See `DYNAMIC_CONFIG_IMPLEMENTATION.md`
- **Complete Summary**: See `PHASES_4_5_6_COMPLETE.md`
- **System Architecture**: See `SYSTEM_ARCHITECTURE.md`

### Database Queries

**View All Active Rules:**
```sql
SELECT * FROM conditional_staffing_rules
WHERE is_active = true
ORDER BY priority;
```

**View Configuration History:**
```sql
SELECT * FROM configuration_audit_log
ORDER BY changed_at DESC
LIMIT 50;
```

**Check Core Positions:**
```sql
SELECT cp.*, p.name as position_name
FROM core_positions cp
JOIN positions p ON cp.position_id = p.id
WHERE cp.is_active = true
ORDER BY cp.priority;
```

### Getting Help
1. Check configuration audit log for recent changes
2. Verify rule condition syntax using JSON validator
3. Test rules individually using activate/deactivate
4. Review documentation for examples
5. Check staff training records if positions not assigning

---

## Keyboard Shortcuts & Tips

### Navigation
- Use tab navigation through forms
- Enter to save forms quickly
- Escape to close modals

### Efficiency Tips
- Save frequently used configurations as defaults
- Use descriptive rule names for easy identification
- Group similar rules with similar priority ranges
- Keep core positions list short and focused
- Review applied rules in results to understand decisions

---

## Common Workflows

### Daily Auto-Assignment Workflow
1. Check forecast for the day
2. Navigate to Deployments
3. Select appropriate date
4. Click "Auto-Assign Positions" for Day Shift
5. Review/adjust configuration (or use saved default)
6. Confirm and review results
7. Make manual adjustments for any special cases
8. Repeat for Night Shift
9. Export PDF for kitchen display

### Weekly Rule Review Workflow
1. Navigate to Rule Management
2. Review "Core Positions" tab
3. Check if all positions are still relevant
4. Review "Conditional Rules" tab
5. Verify rules still match current operations
6. Deactivate outdated rules
7. Create new rules for new operational patterns
8. Test with upcoming week's schedule

### New Rule Creation Workflow
1. Identify operational pattern needing automation
2. Navigate to Rule Management
3. Choose appropriate rule type
4. Write clear, descriptive rule name
5. Define condition matching the pattern
6. Define action to automate
7. Set appropriate priority
8. Add detailed description
9. Save and test with current schedule
10. Monitor results and adjust if needed

---

## Quick Reference Card

### Configuration Modal
- **DT1**: Requires DT Presenter
- **DT2**: No DT Presenter
- **None**: No drive-through
- **Cooks**: 0-5 (typically 1-2)
- **Pack**: 0-5 (typically 2)
- **Save Default**: Persists for future use

### Rule Types
- **Require**: Adds position
- **Exclude**: Removes position
- **Adjust**: Changes count
- **Custom**: Advanced logic

### Priority Scale
- **1-10**: Critical core positions
- **11-50**: Important operational rules
- **51-100**: Optional/situational rules

### Condition Operators
- `eq`: Equals
- `ne`: Not equals
- `gt`: Greater than
- `gte`: Greater than or equal
- `lt`: Less than
- `lte`: Less than or equal
- `in`: In array
- `nin`: Not in array

### Action Formats
- Require: `{"require_position": "Name", "count": 1}`
- Exclude: `{"exclude_position": "Name"}`
- Adjust: `{"adjust_position_count": {"Name": 2}}`

---

**Version**: 1.0
**Last Updated**: October 14, 2025
**System**: KFC Deployment Management System

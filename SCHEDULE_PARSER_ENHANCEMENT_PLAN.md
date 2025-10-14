# Schedule Parser Enhancement Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to enhance the existing KFC Deployment Management System's schedule parser with dynamic staff integration, intelligent position assignment, and automated deployment features.

---

## Current System Analysis

### Existing Components

1. **Schedule Parser** (`scheduleParser.js`)
   - ❌ **Problem**: Uses hardcoded employee list (29 employees with fixed roles)
   - Parses PDF schedules from TeamLive
   - Classifies shifts (Day/Night/Both)
   - Extracts shift times and employee names

2. **Database Tables**
   - `staff` - Staff members with basic info
   - `positions` - Deployment positions (DT, Cook, Burgers, etc.)
   - `deployments` - Daily deployment assignments
   - `shift_schedules` - Imported schedule metadata
   - `schedule_employees` - Employees from imported schedules
   - `schedule_shifts` - Individual shift records
   - `staff_training_stations` - Training records (BOH/FOH/MOH stations)
   - `staff_rankings` - Performance rankings (1-5 stars)
   - `staff_sign_offs` - Manager approvals for stations

3. **Existing Auto-Assignment** (`autoDeploymentAssignment.js`)
   - Creates deployments from schedule shifts
   - Matches schedule employees to staff database
   - ✅ Already functional but limited

---

## Requirements Breakdown

### 1. Dynamic Staff Integration

**Current Issue**:
```javascript
// Hardcoded in scheduleParser.js lines 28-59
const employeeRoles = {
  'MORGAN MILLINGTON': 'Shift Runner Deployment',
  'Oscar Santalla Abad': 'Shift Runner Deployment',
  // ... 27 more hardcoded entries
};
```

**Solution**: Make parser dynamic to handle:
- Staff from database
- Holiday workers (seasonal staff)
- Visiting staff from other stores
- New hires not yet in system

### 2. Station-Position Linking

**Current Gap**: Training stations (BOH Cook, FOH Cashier, etc.) have no link to deployment positions (DT, Cook, Burgers, etc.)

**Need**: UI to map training stations → deployment positions

### 3. Automated Intelligent Deployment

**Current**: Basic deployment creation without position assignment

**Need**: Automatic position assignment based on:
- Trained stations
- Performance rankings
- Availability
- Default position preferences

### 4. Default Position Assignments

**Need**: System to set staff-specific default positions
- Example: "SAMANTHA EDWARDS" → "Burgers" by default
- Example: "Brandon Riding" → "Cook" by default

---

## Implementation Plan

## Phase 1: Database Schema Enhancements

### New Tables

#### 1.1 `staff_roles` Table
```sql
CREATE TABLE IF NOT EXISTS staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('Team Member', 'Cook', 'Shift Runner', 'Manager')),
  is_primary boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**Purpose**: Track staff roles for schedule parsing (replaces hardcoded roles)

#### 1.2 `staff_work_status` Table
```sql
CREATE TABLE IF NOT EXISTS staff_work_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('active', 'holiday_only', 'visiting', 'inactive')),
  home_store text DEFAULT NULL,
  notes text DEFAULT '',
  effective_from date DEFAULT CURRENT_DATE,
  effective_to date DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);
```

**Purpose**: Handle holiday workers, visiting staff, and work status

#### 1.3 `station_position_mappings` Table
```sql
CREATE TABLE IF NOT EXISTS station_position_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name text NOT NULL,
  station_category text NOT NULL CHECK (station_category IN ('BOH', 'FOH', 'MOH')),
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  priority integer DEFAULT 1,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(station_name, position_id)
);
```

**Purpose**: Link training stations to deployment positions

**Example Data**:
| station_name | station_category | position_id | priority |
|--------------|------------------|-------------|----------|
| BOH Cook | BOH | Cook | 1 |
| BOH Cook | BOH | Cook2 | 2 |
| MOH Burgers | MOH | Burgers | 1 |
| FOH Cashier | FOH | Front | 1 |
| FOH Cashier | FOH | Mid | 2 |

#### 1.4 `staff_default_positions` Table
```sql
CREATE TABLE IF NOT EXISTS staff_default_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  priority integer DEFAULT 1,
  shift_type text CHECK (shift_type IN ('Day Shift', 'Night Shift', 'Both')) DEFAULT 'Both',
  day_of_week text DEFAULT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, position_id, shift_type)
);
```

**Purpose**: Store preferred default positions per staff member

**Example Data**:
| staff_id | position_name | priority | shift_type | notes |
|----------|---------------|----------|------------|-------|
| (Samantha) | Burgers | 1 | Both | Burger specialist |
| (Brandon) | Cook | 1 | Day Shift | Day shift cook lead |

#### 1.5 `deployment_auto_assignment_config` Table
```sql
CREATE TABLE IF NOT EXISTS deployment_auto_assignment_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name text UNIQUE NOT NULL,
  enabled boolean DEFAULT true,
  use_training_stations boolean DEFAULT true,
  use_rankings boolean DEFAULT true,
  use_default_positions boolean DEFAULT true,
  min_ranking_threshold decimal DEFAULT 3.0,
  prefer_signed_off_only boolean DEFAULT false,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Purpose**: Configuration for auto-assignment behavior

---

## Phase 2: Enhanced Schedule Parser

### 2.1 Dynamic Employee Detection

**New Function**: `getDynamicEmployeeList()`

```javascript
export async function getDynamicEmployeeList() {
  const { data: staff } = await supabase
    .from('staff')
    .select(`
      id,
      name,
      staff_roles!inner(role),
      staff_work_status(status, effective_from, effective_to)
    `);

  // Build dynamic employee roles object
  const employeeRoles = {};

  staff.forEach(member => {
    // Check if staff is currently active
    const workStatus = member.staff_work_status?.[0];
    if (workStatus && workStatus.status === 'inactive') return;

    // Map role to deployment role
    const role = member.staff_roles?.[0]?.role;
    const deploymentRole = mapRoleToDeploymentRole(role);

    employeeRoles[member.name] = deploymentRole;
  });

  return employeeRoles;
}

function mapRoleToDeploymentRole(role) {
  const roleMap = {
    'Shift Runner': 'Shift Runner Deployment',
    'Team Member': 'Team Member Deployment',
    'Cook': 'Cook Deployment',
    'Manager': 'Manager Deployment'
  };
  return roleMap[role] || 'Team Member Deployment';
}
```

### 2.2 Unknown Employee Handling

**New Function**: `handleUnknownEmployees()`

```javascript
export async function handleUnknownEmployees(scheduleId) {
  const { data: unknownEmployees } = await supabase
    .from('schedule_employees')
    .select('*')
    .eq('schedule_id', scheduleId)
    .is('staff_id', null);

  // Create temporary staff records for visiting/unknown staff
  const results = [];

  for (const employee of unknownEmployees) {
    const { data: tempStaff } = await supabase
      .from('staff')
      .insert({
        name: employee.name,
        is_under_18: false
      })
      .select()
      .single();

    // Mark as visiting staff
    await supabase
      .from('staff_work_status')
      .insert({
        staff_id: tempStaff.id,
        status: 'visiting',
        notes: `Auto-created from schedule import on ${new Date().toISOString()}`
      });

    // Assign default role based on schedule role
    await supabase
      .from('staff_roles')
      .insert({
        staff_id: tempStaff.id,
        role: mapDeploymentRoleToRole(employee.role)
      });

    // Link back to schedule
    await supabase
      .from('schedule_employees')
      .update({ staff_id: tempStaff.id })
      .eq('id', employee.id);

    results.push({
      name: employee.name,
      staffId: tempStaff.id,
      status: 'created_as_visiting'
    });
  }

  return results;
}
```

### 2.3 Updated Parse Function

**Modified**: `parseShiftSchedule()` in `scheduleParser.js`

```javascript
export async function parseShiftSchedule(pdfText) {
  // Get dynamic employee list from database
  const employeeRoles = await getDynamicEmployeeList();

  const schedule = {
    location: '',
    week: {},
    employees: [],
    unmatchedEmployees: []
  };

  // ... existing parsing logic ...

  // Track unmatched employees for later handling
  const allNamesInPdf = extractAllPossibleNames(pdfText);
  const matchedNames = schedule.employees.map(e => e.name);
  schedule.unmatchedEmployees = allNamesInPdf.filter(
    name => !matchedNames.includes(name)
  );

  return schedule;
}
```

---

## Phase 3: Station-Position Linking UI

### 3.1 New Component: `StationPositionMappingPage.jsx`

**Location**: `src/components/StationPositionMappingPage.jsx`

**Features**:
- View all training stations (from `staff_training_stations`)
- Map each station to one or more deployment positions
- Set priority for each mapping
- Visual drag-and-drop interface
- Preview which staff are trained for which positions

**UI Mockup**:
```
┌────────────────────────────────────────────────────────────┐
│  Station-Position Mapping Configuration                    │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Training Station: [BOH Cook ▼]                           │
│                                                             │
│  Mapped Positions:                                         │
│  ┌──────────────────────────────────────────────┐         │
│  │ Priority 1: [Cook      ▼]  [Remove]          │         │
│  │ Priority 2: [Cook2     ▼]  [Remove]          │         │
│  └──────────────────────────────────────────────┘         │
│  [+ Add Position Mapping]                                  │
│                                                             │
│  Preview: 5 staff members trained for this station         │
│  Can be deployed to: Cook (8 positions), Cook2 (5 pos)    │
│                                                             │
│  [Save Mapping]  [Cancel]                                  │
└────────────────────────────────────────────────────────────┘
```

**Key Functions**:
```javascript
// Get all stations from training system
const loadStations = async () => {
  const stations = [
    'BOH Cook', 'FOH Cashier', 'FOH Guest Host', 'FOH Pack',
    'FOH Present', 'MOH Burgers', 'MOH Chicken Pack',
    'Freezer to Fryer', 'MOH Sides'
  ];
  return stations;
};

// Get all deployment positions
const loadPositions = async () => {
  const { data } = await supabase
    .from('positions')
    .select('*')
    .eq('type', 'position')
    .order('name');
  return data;
};

// Save mapping
const saveMapping = async (stationName, positionMappings) => {
  // Delete existing mappings
  await supabase
    .from('station_position_mappings')
    .delete()
    .eq('station_name', stationName);

  // Insert new mappings
  for (const mapping of positionMappings) {
    await supabase
      .from('station_position_mappings')
      .insert({
        station_name: stationName,
        station_category: getStationCategory(stationName),
        position_id: mapping.position_id,
        priority: mapping.priority
      });
  }
};
```

### 3.2 Add to Navigation

**Update**: `DeploymentManagementSystem.jsx`

Add new tab to navigation array:
```javascript
{ id: 'station-mapping', label: 'Station Mapping', icon: Link }
```

---

## Phase 4: Intelligent Auto-Deployment System

### 4.1 New Function: `intelligentAutoDeployment()`

**Location**: `src/utils/intelligentDeploymentAssignment.js` (NEW FILE)

**Logic Flow**:
```
1. Get all unassigned deployments (staff assigned, position blank)
2. For each deployment:
   a. Get staff training stations
   b. Get staff rankings for those stations
   c. Get staff default positions
   d. Get available positions via station mappings
   e. Calculate best position using scoring algorithm
   f. Assign position
3. Return results
```

**Implementation**:
```javascript
export async function intelligentAutoDeployment(date, shiftType) {
  const { data: config } = await supabase
    .from('deployment_auto_assignment_config')
    .select('*')
    .eq('config_name', 'default')
    .single();

  if (!config || !config.enabled) {
    throw new Error('Auto-assignment is disabled');
  }

  // Get deployments without positions
  const { data: deployments } = await supabase
    .from('deployments')
    .select(`
      *,
      staff:staff_id (
        id,
        name,
        staff_training_stations(station_name),
        staff_rankings(station_name, rating),
        staff_sign_offs(station_name),
        staff_default_positions(
          position_id,
          priority,
          shift_type,
          positions(id, name)
        )
      )
    `)
    .eq('date', date)
    .eq('shift_type', shiftType)
    .eq('position', '');

  const results = {
    assigned: [],
    failed: [],
    skipped: []
  };

  for (const deployment of deployments) {
    try {
      const position = await findBestPosition(
        deployment.staff,
        deployment,
        config
      );

      if (position) {
        await supabase
          .from('deployments')
          .update({ position: position.name })
          .eq('id', deployment.id);

        results.assigned.push({
          staffName: deployment.staff.name,
          position: position.name,
          score: position.score
        });
      } else {
        results.skipped.push({
          staffName: deployment.staff.name,
          reason: 'No suitable position found'
        });
      }
    } catch (error) {
      results.failed.push({
        staffName: deployment.staff?.name,
        error: error.message
      });
    }
  }

  return results;
}

async function findBestPosition(staff, deployment, config) {
  const candidates = [];

  // 1. Check default positions first
  if (config.use_default_positions) {
    const defaultPositions = staff.staff_default_positions?.filter(
      dp => dp.shift_type === 'Both' || dp.shift_type === deployment.shift_type
    ) || [];

    for (const dp of defaultPositions) {
      const available = await isPositionAvailable(
        dp.positions.name,
        deployment.date,
        deployment.shift_type
      );

      if (available) {
        candidates.push({
          name: dp.positions.name,
          score: 1000 + (10 - dp.priority), // Highest priority
          source: 'default'
        });
      }
    }
  }

  // 2. Check training stations
  if (config.use_training_stations && candidates.length === 0) {
    const trainedStations = staff.staff_training_stations || [];

    for (const training of trainedStations) {
      // Get position mappings for this station
      const { data: mappings } = await supabase
        .from('station_position_mappings')
        .select('*, positions(name)')
        .eq('station_name', training.station_name)
        .order('priority');

      for (const mapping of mappings || []) {
        const available = await isPositionAvailable(
          mapping.positions.name,
          deployment.date,
          deployment.shift_type
        );

        if (!available) continue;

        // Calculate score
        let score = 100;

        // Add ranking bonus
        if (config.use_rankings) {
          const ranking = staff.staff_rankings?.find(
            r => r.station_name === training.station_name
          );

          if (ranking) {
            score += ranking.rating * 10; // 10-50 points
          }

          // Bonus for sign-off
          const signedOff = staff.staff_sign_offs?.some(
            s => s.station_name === training.station_name
          );

          if (signedOff) {
            score += 20; // Sign-off bonus
          }
        }

        // Priority penalty (prefer priority 1)
        score -= mapping.priority * 5;

        candidates.push({
          name: mapping.positions.name,
          score,
          source: 'training',
          station: training.station_name
        });
      }
    }
  }

  // 3. Filter by minimum ranking if configured
  if (config.min_ranking_threshold > 0) {
    // Additional filtering logic
  }

  // 4. Sort by score and return best
  candidates.sort((a, b) => b.score - a.score);

  return candidates[0] || null;
}

async function isPositionAvailable(positionName, date, shiftType) {
  // Check if position already filled
  const { data: existing } = await supabase
    .from('deployments')
    .select('id')
    .eq('date', date)
    .eq('shift_type', shiftType)
    .eq('position', positionName)
    .maybeSingle();

  return !existing;
}
```

### 4.2 Position Availability Logic

**Considerations**:
- Some positions can have multiple people (Cook, DT)
- Some positions are unique (Burgers, specific areas)
- Need configurable position capacity

**New Table**: `position_capacity`
```sql
CREATE TABLE IF NOT EXISTS position_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  max_concurrent integer DEFAULT 1,
  shift_type text CHECK (shift_type IN ('Day Shift', 'Night Shift', 'Both')) DEFAULT 'Both',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
```

---

## Phase 5: Default Position Assignment UI

### 5.1 New Component: `StaffDefaultPositionsManager.jsx`

**Location**: Embedded in `SettingsPage.jsx` or new dedicated page

**UI Mockup**:
```
┌────────────────────────────────────────────────────────────┐
│  Staff Default Positions                                    │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Staff Member: [SAMANTHA EDWARDS        ▼]                │
│                                                             │
│  Default Positions:                                         │
│  ┌──────────────────────────────────────────────┐         │
│  │ Priority 1: [Burgers ▼] Shift: [Both    ▼]  │         │
│  │             Notes: Burger specialist          │         │
│  │             [Remove]                          │         │
│  │                                               │         │
│  │ Priority 2: [Chick   ▼] Shift: [Day Shift▼] │         │
│  │             Notes: Backup chicken station     │         │
│  │             [Remove]                          │         │
│  └──────────────────────────────────────────────┘         │
│  [+ Add Default Position]                                  │
│                                                             │
│  [Save]  [Cancel]                                          │
└────────────────────────────────────────────────────────────┘
```

**Key Functions**:
```javascript
const saveDefaultPositions = async (staffId, positions) => {
  // Delete existing defaults
  await supabase
    .from('staff_default_positions')
    .delete()
    .eq('staff_id', staffId);

  // Insert new defaults
  for (const pos of positions) {
    await supabase
      .from('staff_default_positions')
      .insert({
        staff_id: staffId,
        position_id: pos.position_id,
        priority: pos.priority,
        shift_type: pos.shift_type,
        notes: pos.notes
      });
  }
};
```

### 5.2 Bulk Default Assignment

**Feature**: Import CSV with default positions

**CSV Format**:
```csv
Staff Name,Position,Priority,Shift Type,Notes
SAMANTHA EDWARDS,Burgers,1,Both,Burger specialist
Brandon Riding,Cook,1,Day Shift,Day lead cook
Brandon Riding,Cook2,2,Night Shift,Night backup
```

---

## Phase 6: Integration & UI Updates

### 6.1 Enhanced Schedule Uploader

**Update**: `ScheduleUploader.jsx`

Add buttons and workflow:
```javascript
const handleScheduleImport = async (file) => {
  // 1. Parse PDF
  const schedule = await parseShiftSchedule(pdfText);

  // 2. Save to database
  await saveScheduleToDatabase(schedule);

  // 3. Match employees
  const matches = await matchScheduleEmployeesToStaff(scheduleId);

  // 4. Handle unknown employees
  const unknowns = await handleUnknownEmployees(scheduleId);

  // 5. Show review screen
  setReviewData({ matches, unknowns });
};

const handleAutoDeployment = async () => {
  // 1. Create basic deployments (existing function)
  await autoAssignScheduleToDeployments(scheduleId, weekStartDate);

  // 2. Run intelligent position assignment (NEW)
  const results = await intelligentAutoDeployment(date, shiftType);

  setAutoAssignResults(results);
};
```

**UI Enhancement**:
```
After upload, show options:
[ ] Auto-create deployments
[ ] Auto-assign positions based on training
[ ] Use default positions
[ ] Only assign to signed-off stations

[Proceed with Auto-Assignment]
```

### 6.2 Deployment Page Enhancements

**Update**: `DeploymentPage.jsx`

Add button:
```javascript
<button onClick={() => runIntelligentAssignment(date, shiftType)}>
  🤖 Auto-Assign Positions
</button>
```

Shows results:
```
✅ Assigned 12 positions
⚠️  Skipped 3 (no training found)
❌ Failed 1 (position full)
```

---

## Phase 7: Migration Scripts

### 7.1 Database Migration

**File**: `supabase/migrations/YYYYMMDD_schedule_parser_enhancements.sql`

```sql
/*
  # Schedule Parser Enhancements

  1. New Tables
    - staff_roles: Staff role tracking
    - staff_work_status: Work status (active/holiday/visiting)
    - station_position_mappings: Link training stations to positions
    - staff_default_positions: Default position preferences
    - deployment_auto_assignment_config: Auto-assignment settings
    - position_capacity: Position capacity limits

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated access
*/

-- Staff roles table
CREATE TABLE IF NOT EXISTS staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('Team Member', 'Cook', 'Shift Runner', 'Manager')),
  is_primary boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Staff work status table
CREATE TABLE IF NOT EXISTS staff_work_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('active', 'holiday_only', 'visiting', 'inactive')),
  home_store text DEFAULT NULL,
  notes text DEFAULT '',
  effective_from date DEFAULT CURRENT_DATE,
  effective_to date DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Station-position mappings table
CREATE TABLE IF NOT EXISTS station_position_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name text NOT NULL,
  station_category text NOT NULL CHECK (station_category IN ('BOH', 'FOH', 'MOH')),
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  priority integer DEFAULT 1,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(station_name, position_id)
);

-- Staff default positions table
CREATE TABLE IF NOT EXISTS staff_default_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  priority integer DEFAULT 1,
  shift_type text CHECK (shift_type IN ('Day Shift', 'Night Shift', 'Both')) DEFAULT 'Both',
  day_of_week text DEFAULT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, position_id, shift_type)
);

-- Auto-assignment configuration table
CREATE TABLE IF NOT EXISTS deployment_auto_assignment_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name text UNIQUE NOT NULL,
  enabled boolean DEFAULT true,
  use_training_stations boolean DEFAULT true,
  use_rankings boolean DEFAULT true,
  use_default_positions boolean DEFAULT true,
  min_ranking_threshold decimal DEFAULT 3.0,
  prefer_signed_off_only boolean DEFAULT false,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Position capacity table
CREATE TABLE IF NOT EXISTS position_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  max_concurrent integer DEFAULT 1,
  shift_type text CHECK (shift_type IN ('Day Shift', 'Night Shift', 'Both')) DEFAULT 'Both',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_work_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_position_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_default_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_auto_assignment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_capacity ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated access to staff_roles"
  ON staff_roles FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated access to staff_work_status"
  ON staff_work_status FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated access to station_position_mappings"
  ON station_position_mappings FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated access to staff_default_positions"
  ON staff_default_positions FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated access to deployment_auto_assignment_config"
  ON deployment_auto_assignment_config FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated access to position_capacity"
  ON position_capacity FOR ALL TO authenticated USING (true);

-- Insert default config
INSERT INTO deployment_auto_assignment_config (
  config_name,
  enabled,
  use_training_stations,
  use_rankings,
  use_default_positions,
  min_ranking_threshold,
  prefer_signed_off_only
) VALUES (
  'default',
  true,
  true,
  true,
  true,
  3.0,
  false
) ON CONFLICT (config_name) DO NOTHING;

-- Insert default station-position mappings
-- BOH Cook
INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'BOH Cook', 'BOH', id, 1 FROM positions WHERE name = 'Cook' AND type = 'position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'BOH Cook', 'BOH', id, 2 FROM positions WHERE name = 'Cook2' AND type = 'position'
ON CONFLICT DO NOTHING;

-- MOH Burgers
INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'MOH Burgers', 'MOH', id, 1 FROM positions WHERE name = 'Burgers' AND type = 'position'
ON CONFLICT DO NOTHING;

-- FOH Cashier
INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'FOH Cashier', 'FOH', id, 1 FROM positions WHERE name = 'Front' AND type = 'position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'FOH Cashier', 'FOH', id, 2 FROM positions WHERE name = 'Mid' AND type = 'position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'FOH Cashier', 'FOH', id, 3 FROM positions WHERE name = 'DT' AND type = 'position'
ON CONFLICT DO NOTHING;

-- FOH Pack
INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'FOH Pack', 'FOH', id, 1 FROM positions WHERE name = 'DT Pack' AND type = 'pack_position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'FOH Pack', 'FOH', id, 2 FROM positions WHERE name = 'Rst Pack' AND type = 'pack_position'
ON CONFLICT DO NOTHING;

-- MOH Chicken Pack
INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'MOH Chicken Pack', 'MOH', id, 1 FROM positions WHERE name = 'Chick' AND type = 'position'
ON CONFLICT DO NOTHING;

-- MOH Sides
INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'MOH Sides', 'MOH', id, 1 FROM positions WHERE name = 'Fries' AND type = 'position'
ON CONFLICT DO NOTHING;

-- Freezer to Fryer
INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'Freezer to Fryer', 'MOH', id, 1 FROM positions WHERE name = 'Rst' AND type = 'position'
ON CONFLICT DO NOTHING;
```

### 7.2 Data Migration Script

**File**: `src/utils/dataMigration.js`

```javascript
export async function migrateExistingStaffToNewSystem() {
  // Get all staff
  const { data: staff } = await supabase
    .from('staff')
    .select('*');

  for (const member of staff) {
    // Create default active status
    await supabase
      .from('staff_work_status')
      .insert({
        staff_id: member.id,
        status: 'active',
        effective_from: member.created_at
      })
      .onConflict('staff_id')
      .ignore();

    // Assign default role (Team Member)
    await supabase
      .from('staff_roles')
      .insert({
        staff_id: member.id,
        role: 'Team Member',
        is_primary: true
      })
      .onConflict('staff_id')
      .ignore();
  }

  return { migrated: staff.length };
}
```

---

## Testing Strategy

### Unit Tests

1. **Dynamic Employee List**
   - Test with various staff roles
   - Test with inactive staff
   - Test with visiting staff

2. **Position Scoring Algorithm**
   - Test default position priority
   - Test training station scoring
   - Test ranking bonuses
   - Test sign-off bonuses

3. **Station Mapping**
   - Test multiple positions per station
   - Test priority ordering
   - Test missing mappings

### Integration Tests

1. **Full Schedule Import Flow**
   - Upload PDF → Parse → Match → Create Deployments → Assign Positions
   - Test with known employees
   - Test with unknown employees
   - Test with visiting staff

2. **Auto-Assignment Flow**
   - Test with various configurations
   - Test position capacity limits
   - Test conflicting preferences

### User Acceptance Testing

1. **Schedule Upload**
   - [ ] Upload schedule PDF
   - [ ] Verify all employees recognized
   - [ ] Verify unknown employees handled correctly
   - [ ] Verify visiting staff created properly

2. **Station Mapping**
   - [ ] Configure station-position mappings
   - [ ] Verify priority ordering works
   - [ ] Verify preview shows correct staff counts

3. **Default Positions**
   - [ ] Set default positions for staff
   - [ ] Verify defaults used in auto-assignment
   - [ ] Verify shift-specific defaults work

4. **Auto-Assignment**
   - [ ] Run auto-assignment after schedule import
   - [ ] Verify positions assigned correctly
   - [ ] Verify training levels respected
   - [ ] Verify rankings influence assignment

---

## Deployment Checklist

### Pre-Deployment

- [ ] Run database migration
- [ ] Run data migration for existing staff
- [ ] Configure default station-position mappings
- [ ] Test schedule parser with recent PDFs
- [ ] Verify all new UI pages load correctly
- [ ] Test auto-assignment with sample data

### Deployment Steps

1. Backup current database
2. Apply database migration
3. Run data migration script
4. Deploy new code
5. Test critical paths
6. Monitor for errors

### Post-Deployment

- [ ] Verify existing functionality still works
- [ ] Test one full schedule import
- [ ] Train users on new features
- [ ] Monitor auto-assignment results
- [ ] Gather feedback for refinements

---

## Future Enhancements

1. **Machine Learning**
   - Learn optimal position assignments from historical data
   - Predict staff performance at different positions
   - Suggest training needs based on deployment patterns

2. **Advanced Scheduling**
   - Shift swap requests
   - Availability preferences
   - Conflict detection

3. **Reporting**
   - Staff utilization reports
   - Position coverage reports
   - Training gap analysis

4. **Mobile Support**
   - Mobile-responsive deployment view
   - Push notifications for assignments
   - Quick position changes from mobile

---

## Summary

This implementation plan provides a comprehensive roadmap for enhancing the schedule parser with:

✅ **Dynamic Staff Integration** - No more hardcoded employee lists
✅ **Flexible Staff Status** - Handle holiday workers and visiting staff
✅ **Station-Position Linking** - Bridge training and deployment systems
✅ **Intelligent Auto-Assignment** - Smart position assignment based on multiple factors
✅ **Default Positions** - Configure preferred positions per staff member
✅ **Backward Compatibility** - All existing features preserved

The phased approach ensures each component can be built, tested, and deployed independently while maintaining system stability.

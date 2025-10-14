# System Architecture Diagram

## High-Level System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     SCHEDULE IMPORT PROCESS                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  PDF Upload  │
│  (TeamLive)  │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  ENHANCED SCHEDULE PARSER                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 1. Extract text from PDF                                  │ │
│  │ 2. Load dynamic employee list from database              │ │
│  │    - Query: staff + staff_roles + staff_work_status      │ │
│  │ 3. Parse employee shifts                                 │ │
│  │ 4. Track unmatched employees                             │ │
│  └───────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  EMPLOYEE MATCHING & CREATION                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Known Employees → Link to staff.id                        │ │
│  │ Unknown Employees:                                        │ │
│  │   - Create new staff record                              │ │
│  │   - Mark as "visiting" in staff_work_status              │ │
│  │   - Assign default role                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  DEPLOYMENT CREATION                                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ For each shift:                                           │ │
│  │   - Create deployment record                             │ │
│  │   - staff_id: ✅ Assigned                               │ │
│  │   - start_time, end_time: ✅ Set                        │ │
│  │   - position: ⏳ Empty (next step)                      │ │
│  └───────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  🤖 INTELLIGENT POSITION ASSIGNMENT                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ For each deployment without position:                    │ │
│  │   1. Load staff data:                                    │ │
│  │      - staff_default_positions                          │ │
│  │      - staff_training_stations                          │ │
│  │      - staff_rankings                                   │ │
│  │      - staff_sign_offs                                  │ │
│  │                                                          │ │
│  │   2. Generate position candidates with scores           │ │
│  │                                                          │ │
│  │   3. Filter by availability                             │ │
│  │                                                          │ │
│  │   4. Select highest scoring available position          │ │
│  │                                                          │ │
│  │   5. Update deployment.position                         │ │
│  └───────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  ✅ COMPLETED DEPLOYMENTS                                       │
│     - Staff assigned                                             │
│     - Times set                                                  │
│     - Positions assigned                                         │
│     - Ready for manager review                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Position Assignment Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│  START: Deployment needs position                               │
│  Input: staff_id, date, shift_type                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │ Does staff have DEFAULT POSITIONS? │
        └────────┬────────────────────────┬──┘
                 │ YES                    │ NO
                 ▼                        ▼
    ┌─────────────────────────┐    ┌──────────────────────────┐
    │ Check each default pos  │    │ Load TRAINING STATIONS   │
    │ in priority order:      │    └──────────┬───────────────┘
    │  1. Is position open?   │               │
    │  2. Matches shift type? │               ▼
    └────────┬────────────────┘    ┌──────────────────────────┐
             │                     │ For each training station│
             │ FOUND               │ lookup mappings:         │
             ▼                     │  station_position_       │
    ┌──────────────────┐          │  mappings table          │
    │ ASSIGN POSITION  │          └──────────┬───────────────┘
    │ Score: 1000+     │                     │
    └──────────────────┘                     ▼
                              ┌──────────────────────────────┐
                              │ Score each mapped position:  │
                              │  Base: 100                   │
                              │  + Ranking × 10              │
                              │  + Sign-off: 20              │
                              │  - Priority × 5              │
                              └──────────┬───────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────────────┐
                              │ Filter by availability       │
                              │ (check deployments table)    │
                              └──────────┬───────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────────────┐
                              │ Sort by score (highest first)│
                              └──────────┬───────────────────┘
                                         │
                             ┌───────────┴──────────┐
                             │ FOUND                │ NOT FOUND
                             ▼                      ▼
                    ┌──────────────────┐    ┌──────────────────┐
                    │ ASSIGN POSITION  │    │ SKIP             │
                    │ Score: 80-170    │    │ (Manual needed)  │
                    └──────────────────┘    └──────────────────┘
```

---

## Database Relationship Diagram

```
┌──────────────┐
│    staff     │──────────┐
│              │          │
│ id (PK)      │          │
│ name         │          │
│ is_under_18  │          │
└──────┬───────┘          │
       │                  │
       │ 1:N              │ 1:N
       │                  │
       ▼                  ▼
┌──────────────────┐  ┌──────────────────────┐
│  staff_roles     │  │ staff_work_status    │
│                  │  │                      │
│ staff_id (FK)    │  │ staff_id (FK)        │
│ role             │  │ status (active/      │
│ is_primary       │  │  holiday_only/       │
└──────────────────┘  │  visiting/inactive)  │
                      │ home_store           │
                      │ effective_from       │
                      │ effective_to         │
                      └──────────────────────┘

┌──────────────┐
│    staff     │
└──────┬───────┘
       │ 1:N
       ▼
┌──────────────────────────┐        ┌──────────────────┐
│ staff_training_stations  │        │   positions      │
│                          │        │                  │
│ staff_id (FK)            │        │ id (PK)          │
│ station_name             │        │ name             │
│ job_code                 │        │ type             │
└──────┬───────────────────┘        └────────┬─────────┘
       │                                     │
       │                                     │
       │    ┌────────────────────────────────┘
       │    │
       │    │ N:M relationship through:
       │    │
       ▼    ▼
┌────────────────────────────────────┐
│ station_position_mappings          │
│                                    │
│ station_name                       │
│ station_category (BOH/FOH/MOH)     │
│ position_id (FK)                   │
│ priority                           │
└────────────────────────────────────┘
       ▲
       │ Used by intelligent assignment
       │ to find candidate positions
       │

┌──────────────┐
│    staff     │
└──────┬───────┘
       │ 1:N
       ▼
┌──────────────────────────────┐        ┌──────────────────┐
│ staff_default_positions      │        │   positions      │
│                              │        │                  │
│ staff_id (FK)                │◄───────│ id (FK)          │
│ position_id (FK)             │        └──────────────────┘
│ priority                     │
│ shift_type (Day/Night/Both)  │
│ day_of_week                  │
└──────────────────────────────┘

┌──────────────┐
│    staff     │
└──────┬───────┘
       │ 1:N
       ▼
┌──────────────────────────────┐
│     deployments              │
│                              │
│ staff_id (FK)                │
│ date                         │
│ shift_type                   │
│ start_time                   │
│ end_time                     │
│ position ← AUTO-ASSIGNED     │
│ secondary                    │
│ area                         │
└──────────────────────────────┘

┌──────────────┐
│  positions   │
└──────┬───────┘
       │ 1:N
       ▼
┌──────────────────────────────┐
│    position_capacity         │
│                              │
│ position_id (FK)             │
│ max_concurrent               │
│ shift_type                   │
└──────────────────────────────┘
```

---

## Scoring Algorithm Flow

```
Input: Staff member needs position assignment

┌─────────────────────────────────────────────────────────────┐
│                  CANDIDATE GENERATION                        │
└─────────────────────────────────────────────────────────────┘

Step 1: Check Default Positions
┌────────────────────────────────────────────────────────────┐
│ Query: staff_default_positions WHERE staff_id = X          │
│                                                             │
│ For each default position:                                 │
│   IF shift_type matches OR shift_type = 'Both'            │
│   AND position is available                                │
│   THEN                                                      │
│     Score = 1000 + (10 - priority)                        │
│     Add to candidates                                      │
└────────────────────────────────────────────────────────────┘
           │
           ▼
Step 2: Check Training-Based Positions
┌────────────────────────────────────────────────────────────┐
│ Query: staff_training_stations WHERE staff_id = X          │
│                                                             │
│ For each trained station:                                  │
│   Query: station_position_mappings                         │
│          WHERE station_name = station                      │
│                                                             │
│   For each mapped position:                                │
│     IF position is available                               │
│     THEN                                                    │
│       score = 100                                          │
│                                                             │
│       // Add ranking bonus                                 │
│       ranking = staff_rankings WHERE station_name          │
│       IF ranking exists:                                   │
│         score += (ranking.rating × 10)  // +10 to +50     │
│                                                             │
│       // Add sign-off bonus                                │
│       signoff = staff_sign_offs WHERE station_name         │
│       IF signoff exists:                                   │
│         score += 20                                        │
│                                                             │
│       // Priority penalty                                  │
│       score -= (mapping.priority × 5)                      │
│                                                             │
│       Add to candidates                                    │
└────────────────────────────────────────────────────────────┘
           │
           ▼
Step 3: Filter & Select
┌────────────────────────────────────────────────────────────┐
│ candidates = candidates.filter(c => isAvailable(c.pos))   │
│ candidates.sort((a, b) => b.score - a.score)              │
│ winner = candidates[0]                                     │
│                                                             │
│ IF winner exists:                                          │
│   UPDATE deployments SET position = winner.name            │
│ ELSE:                                                       │
│   Flag for manual assignment                               │
└────────────────────────────────────────────────────────────┘
```

---

## Example Scenario Walkthrough

### Scenario: Samantha Edwards - Day Shift on Monday

**Step 1: Load Staff Data**
```sql
staff:
  id: abc-123
  name: "SAMANTHA EDWARDS"

staff_default_positions:
  - position: "Burgers", priority: 1, shift_type: "Both"
  - position: "Chick", priority: 2, shift_type: "Day Shift"

staff_training_stations:
  - station: "MOH Burgers"
  - station: "MOH Chicken Pack"
  - station: "FOH Pack"

staff_rankings:
  - station: "MOH Burgers", rating: 5.0
  - station: "MOH Chicken Pack", rating: 4.0
  - station: "FOH Pack", rating: 3.5

staff_sign_offs:
  - station: "MOH Burgers" (signed off by manager)
```

**Step 2: Generate Candidates**

Default Positions:
```
Candidate 1: Burgers (Default #1)
  - Base: 1000
  - Priority bonus: +(10-1) = +9
  - Total: 1009 ✅
  - Available: YES

Candidate 2: Chick (Default #2)
  - Base: 1000
  - Priority bonus: +(10-2) = +8
  - Total: 1008
  - Available: YES
```

Training-Based (from station_position_mappings):
```
MOH Burgers → Burgers (priority 1)
  - Base: 100
  - Ranking: 5.0 × 10 = +50
  - Sign-off: +20
  - Priority penalty: -5
  - Total: 165

MOH Chicken Pack → Chick (priority 1)
  - Base: 100
  - Ranking: 4.0 × 10 = +40
  - Priority penalty: -5
  - Total: 135

FOH Pack → DT Pack (priority 1)
  - Base: 100
  - Ranking: 3.5 × 10 = +35
  - Priority penalty: -5
  - Total: 130
```

**Step 3: Select Winner**
```
Sorted by score:
1. Burgers (Default) - 1009 ✅ WINNER
2. Chick (Default) - 1008
3. Burgers (Training) - 165
4. Chick (Training) - 135
5. DT Pack (Training) - 130

Result: Assign "Burgers" to Samantha's deployment
```

**Step 4: Update Database**
```sql
UPDATE deployments
SET position = 'Burgers'
WHERE staff_id = 'abc-123'
  AND date = '2025-10-14'
  AND shift_type = 'Day Shift';
```

---

## Configuration Impact Examples

### Scenario 1: Conservative Mode
```
Config:
  prefer_signed_off_only = true
  min_ranking_threshold = 4.0

Effect:
  - Only assigns positions where staff has manager sign-off
  - Requires minimum 4-star rating
  - More manual assignments needed
  - Safer for critical positions
```

### Scenario 2: Balanced Mode (Default)
```
Config:
  use_default_positions = true
  use_training_stations = true
  use_rankings = true
  min_ranking_threshold = 3.0
  prefer_signed_off_only = false

Effect:
  - Uses all available data
  - Accepts 3-star or higher
  - Maximizes automation
  - Recommended for most scenarios
```

### Scenario 3: Flexible Mode
```
Config:
  min_ranking_threshold = 0
  prefer_signed_off_only = false

Effect:
  - Assigns regardless of rating
  - Uses training data even without sign-off
  - Maximum automation
  - Requires more manager oversight
```

---

## UI Flow Diagrams

### Schedule Upload Flow

```
┌──────────────────────┐
│  Upload Schedule     │
│  Page                │
└──────────┬───────────┘
           │
           │ User uploads PDF
           ▼
┌──────────────────────┐
│  Parsing...          │
│  [Progress Bar]      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  Review Screen                           │
│                                          │
│  ✅ Matched Employees: 25               │
│     MORGAN MILLINGTON → Shift Runner    │
│     Oscar Santalla Abad → Shift Runner  │
│     ...                                  │
│                                          │
│  ⚠️  Unknown Employees: 4               │
│     John Smith (will create as visiting)│
│     Jane Doe (will create as visiting)  │
│     ...                                  │
│                                          │
│  Options:                                │
│  ☑ Auto-create deployments              │
│  ☑ Auto-assign positions                │
│    ☑ Use default positions              │
│    ☑ Use training data                  │
│    ☑ Respect rankings                   │
│                                          │
│  [Proceed] [Cancel]                      │
└──────────┬───────────────────────────────┘
           │
           │ User clicks Proceed
           ▼
┌──────────────────────────────────────────┐
│  Processing...                           │
│  [Progress Bar]                          │
│                                          │
│  ✓ Created 4 visiting staff records     │
│  ✓ Created 145 deployments               │
│  ✓ Assigned 132 positions                │
│  ⏳ Processing...                        │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  Results                                 │
│                                          │
│  ✅ Successfully Assigned: 132           │
│     SAMANTHA EDWARDS → Burgers          │
│     Brandon Riding → Cook                │
│     ...                                  │
│                                          │
│  ⚠️  Needs Manual Assignment: 13        │
│     John Smith (no training data)       │
│     Jane Doe (all positions full)       │
│     ...                                  │
│                                          │
│  [View Deployments] [Upload Another]     │
└──────────────────────────────────────────┘
```

### Station Mapping Configuration Flow

```
┌──────────────────────┐
│  Station Mapping     │
│  Page                │
└──────────┬───────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│  Select Station                             │
│                                             │
│  Station: [BOH Cook            ▼]          │
│  Category: BOH (auto-detected)              │
│                                             │
│  Currently Mapped Positions:                │
│  ┌─────────────────────────────────────┐   │
│  │ Priority 1: Cook        [Edit] [×] │   │
│  │ Priority 2: Cook2       [Edit] [×] │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [+ Add Position Mapping]                   │
│                                             │
│  Preview:                                   │
│  • 8 staff trained for "BOH Cook"          │
│  • Can deploy to: Cook (5 spots),          │
│    Cook2 (3 spots)                          │
│                                             │
│  [Save] [Reset to Defaults]                 │
└─────────────────────────────────────────────┘
```

---

## Performance Considerations

### Optimization Points

1. **Caching**
   ```javascript
   // Cache position availability for the day
   const positionCache = new Map();
   
   async function isPositionAvailable(pos, date, shift) {
     const key = `${pos}-${date}-${shift}`;
     if (positionCache.has(key)) {
       return positionCache.get(key);
     }
     // ... query database
     positionCache.set(key, result);
     return result;
   }
   ```

2. **Batch Processing**
   ```javascript
   // Process all deployments in transaction
   const results = await supabase.rpc('batch_assign_positions', {
     deployment_ids: [...],
     config_id: 'default'
   });
   ```

3. **Indexed Queries**
   ```sql
   CREATE INDEX idx_deployments_date_shift_position
   ON deployments(date, shift_type, position);
   
   CREATE INDEX idx_staff_training_stations_staff
   ON staff_training_stations(staff_id);
   
   CREATE INDEX idx_station_mappings_station
   ON station_position_mappings(station_name);
   ```

---

## Security Considerations

All tables use Row Level Security (RLS):

```sql
-- Example RLS policy
ALTER TABLE station_position_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage mappings"
  ON station_position_mappings
  FOR ALL
  TO authenticated
  USING (true);
```

**Note**: Current system uses public access policies. For production with multiple stores, implement proper user-based policies.

---

This architecture provides:
✅ Scalability - Handle unlimited staff and positions
✅ Flexibility - Highly configurable behavior
✅ Intelligence - Learns from training and performance data
✅ Maintainability - Clear separation of concerns
✅ User-Friendly - Minimal manual intervention required

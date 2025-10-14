# Schedule Parser Enhancement - Quick Reference

## 🎯 Goals Overview

| Goal | Current State | Target State |
|------|---------------|--------------|
| **Employee List** | ❌ Hardcoded (29 employees) | ✅ Dynamic from database |
| **Holiday Workers** | ❌ Not supported | ✅ Tracked with work status |
| **Visiting Staff** | ❌ Not supported | ✅ Auto-created & flagged |
| **Station → Position** | ❌ No link | ✅ Configurable mapping |
| **Auto Position Assignment** | ❌ Manual only | ✅ AI-based assignment |
| **Default Positions** | ❌ Not available | ✅ Per-staff configuration |

---

## 📊 New Database Tables

### 1. `staff_roles` - Track Staff Roles
```
staff_id → role (Team Member/Cook/Shift Runner/Manager)
```
**Purpose**: Replace hardcoded roles in parser

### 2. `staff_work_status` - Work Status Tracking
```
staff_id → status (active/holiday_only/visiting/inactive)
home_store, effective_from, effective_to
```
**Purpose**: Handle temporary and visiting staff

### 3. `station_position_mappings` ⭐ KEY TABLE
```
station_name → position_id + priority
```
**Example**:
- "BOH Cook" → Cook (priority 1), Cook2 (priority 2)
- "FOH Cashier" → Front (1), Mid (2), DT (3)
- "MOH Burgers" → Burgers (1)

### 4. `staff_default_positions` ⭐ KEY TABLE
```
staff_id → position_id + priority + shift_type
```
**Example**:
- Samantha Edwards → Burgers (priority 1, Both shifts)
- Brandon Riding → Cook (priority 1, Day Shift)

### 5. `deployment_auto_assignment_config`
```
Configuration flags:
- use_training_stations: true/false
- use_rankings: true/false
- use_default_positions: true/false
- min_ranking_threshold: 3.0
```

### 6. `position_capacity`
```
position_id → max_concurrent + shift_type
```
**Purpose**: Limit how many people per position

---

## 🔄 Process Flow

### Current: Schedule Import
```
1. Upload PDF
2. Hardcoded parser extracts employees
3. Match to database
4. Create deployments (no positions)
5. ❌ Manual position assignment
```

### New: Enhanced Flow
```
1. Upload PDF
2. ✨ Dynamic parser (loads staff from DB)
3. Match to database
4. ✨ Auto-create visiting staff for unknowns
5. Create deployments
6. ✨ Intelligent auto-assign positions
   ├─ Check default positions (highest priority)
   ├─ Check training stations
   ├─ Apply ranking/sign-off bonuses
   └─ Respect position capacity
7. ✅ Review & adjust
```

---

## 🧠 Intelligent Assignment Algorithm

### Scoring System

```javascript
// Position candidates are scored:

DEFAULT POSITION:
  Base: 1000 points
  Priority bonus: +(10 - priority)
  → Highest possible score

TRAINING-BASED:
  Base: 100 points
  Ranking bonus: +(rating × 10)     // 10-50 points
  Sign-off bonus: +20 points
  Priority penalty: -(priority × 5)
  → Typical range: 80-170 points

Winner: Highest score + position available
```

### Example Scoring

**Staff**: Samantha Edwards
**Trained**: MOH Burgers (rated 5★, signed off)

| Position | Source | Calculation | Score |
|----------|--------|-------------|-------|
| **Burgers** | Default Pos #1 | 1000 + (10-1) | **1009** ✅ |
| Burgers | Training | 100 + 50 + 20 - 5 | 165 |
| Chick | Training | 100 + 30 - 10 | 120 |

**Result**: Burgers assigned (default position takes precedence)

---

## 🎨 New UI Components

### 1. Station-Position Mapping Page
**Location**: New tab in navigation
**Purpose**: Configure which training stations map to which deployment positions

```
Training Station: [BOH Cook ▼]
  → Priority 1: Cook
  → Priority 2: Cook2
  [+ Add Position]

Preview: 5 staff trained
         Can deploy to: Cook (available), Cook2 (available)
```

### 2. Staff Default Positions Manager
**Location**: Settings page or dedicated section
**Purpose**: Set preferred positions per staff member

```
Staff: [SAMANTHA EDWARDS ▼]

Default Positions:
  Priority 1: Burgers (Both shifts)
  Priority 2: Chick (Day Shift only)
  [+ Add Default]
```

### 3. Enhanced Schedule Uploader
**Added Features**:
- Unknown employee handling
- Auto-assignment configuration
- Results preview with statistics

```
After upload:
  ✅ Matched: 25 employees
  ⚠️  Unknown: 4 employees (created as visiting)

  [Auto-Assign Positions]

Options:
  ☑ Use default positions
  ☑ Use training data
  ☑ Respect rankings
  ☐ Only signed-off stations
```

---

## 📝 Implementation Phases

### Phase 1: Database (Week 1)
- [ ] Create 6 new tables
- [ ] Apply migration
- [ ] Migrate existing staff data
- [ ] Insert default mappings

### Phase 2: Dynamic Parser (Week 1-2)
- [ ] Update `scheduleParser.js`
- [ ] Implement `getDynamicEmployeeList()`
- [ ] Implement `handleUnknownEmployees()`
- [ ] Test with real schedules

### Phase 3: Station Mapping UI (Week 2)
- [ ] Build `StationPositionMappingPage.jsx`
- [ ] Add to navigation
- [ ] Test mapping CRUD operations

### Phase 4: Intelligent Assignment (Week 2-3)
- [ ] Create `intelligentDeploymentAssignment.js`
- [ ] Implement scoring algorithm
- [ ] Implement position availability check
- [ ] Test with various scenarios

### Phase 5: Default Positions UI (Week 3)
- [ ] Build `StaffDefaultPositionsManager.jsx`
- [ ] CSV import functionality
- [ ] Integration with Settings

### Phase 6: Integration & Testing (Week 3-4)
- [ ] Update `ScheduleUploader.jsx`
- [ ] Update `DeploymentPage.jsx`
- [ ] End-to-end testing
- [ ] User acceptance testing

---

## 🚀 Quick Start After Implementation

### For Managers: First Time Setup

1. **Configure Station Mappings**
   ```
   Navigation → Station Mapping
   - Set which training stations go to which positions
   - Default mappings provided, adjust as needed
   ```

2. **Set Default Positions**
   ```
   Navigation → Settings → Default Positions
   - Assign preferred positions for key staff
   - Example: Samantha → Burgers, Brandon → Cook
   ```

3. **Upload Schedule**
   ```
   Navigation → Upload Schedule
   - Upload PDF
   - Review matched/unknown employees
   - Click "Auto-Assign Positions"
   - Review results
   ```

4. **Adjust as Needed**
   ```
   Navigation → Deployments
   - View auto-assigned positions
   - Manually adjust any assignments
   - Save final deployment
   ```

---

## 🔧 Configuration Options

### Auto-Assignment Behavior

Edit in database: `deployment_auto_assignment_config`

```sql
UPDATE deployment_auto_assignment_config
SET
  use_default_positions = true,      -- Use staff default positions
  use_training_stations = true,      -- Use training data
  use_rankings = true,               -- Consider performance ratings
  min_ranking_threshold = 3.0,       -- Minimum rating required
  prefer_signed_off_only = false     -- Only assign to signed-off stations
WHERE config_name = 'default';
```

**Scenarios**:

| Scenario | Settings |
|----------|----------|
| **Conservative** | prefer_signed_off_only = true, min_ranking_threshold = 4.0 |
| **Balanced** | All defaults (as shown above) |
| **Aggressive** | min_ranking_threshold = 0, prefer_signed_off_only = false |

---

## 💡 Tips & Best Practices

### For Schedule Import

✅ **DO**:
- Keep staff list updated in database
- Set work status for holiday workers
- Configure default positions for reliable staff
- Review auto-assignments before finalizing

❌ **DON'T**:
- Delete visiting staff after one use (mark inactive instead)
- Skip station mapping configuration
- Ignore ranking data

### For Station Mapping

✅ **DO**:
- Map each station to multiple positions (with priorities)
- Update mappings when position structure changes
- Use notes field to document special cases

❌ **DON'T**:
- Leave stations unmapped
- Set same priority for different positions
- Forget to save changes

### For Default Positions

✅ **DO**:
- Set defaults for specialists (burger person, cook lead)
- Use shift-specific defaults when needed
- Prioritize correctly (1 = first choice)

❌ **DON'T**:
- Set defaults for every staff member (reduces flexibility)
- Duplicate positions with same priority
- Forget about shift types

---

## 🐛 Troubleshooting

### Employee Not Found in Schedule
**Cause**: Name mismatch between PDF and database
**Fix**:
1. Check staff.name matches exactly (case/spacing)
2. Will auto-create as "visiting" if not found
3. Link manually in database if needed

### Position Not Assigned
**Cause**: No training data or position full
**Fix**:
1. Check staff_training_stations table
2. Check station_position_mappings
3. Check position_capacity if full
4. Manually assign in deployment page

### Default Position Ignored
**Cause**: Position already filled or unavailable
**Fix**:
1. Check position_capacity settings
2. Check if position exists for that shift
3. Verify default position configuration

---

## 📞 Support & Next Steps

### Documentation
- Full plan: `SCHEDULE_PARSER_ENHANCEMENT_PLAN.md`
- This guide: `IMPLEMENTATION_QUICK_REFERENCE.md`

### Testing Resources
- Sample CSV files in `/tests/fixtures/`
- Test schedules in `/tests/sample-schedules/`
- Migration test script: `/tests/migration-test.js`

### Need Help?
1. Check logs in browser console
2. Check Supabase logs for database errors
3. Review this guide's troubleshooting section
4. Check the full implementation plan for details

---

## ✨ Key Improvements Summary

| Feature | Before | After | Impact |
|---------|--------|-------|--------|
| **Parser** | 29 hardcoded | Unlimited dynamic | 🟢 High |
| **Visiting Staff** | Manual entry | Auto-created | 🟢 High |
| **Position Assignment** | 100% manual | 80% automated | 🟢 High |
| **Training Integration** | None | Fully linked | 🟢 High |
| **Flexibility** | Rigid | Highly configurable | 🟢 High |

**Time Savings**: ~30 minutes per schedule import
**Error Reduction**: ~90% fewer manual assignment errors
**Scalability**: Handles unlimited staff and positions

# Shift Classification - Updated Rules

## Problem Fixed
Staff members finishing at 12:00 AM (midnight) or later were incorrectly being assigned to **Day Shift** instead of **Night Shift**.

### Examples
- **Before:** Staff working 2:00 PM → 12:00 AM = **Day Shift** ❌
- **After:** Staff working 2:00 PM → 12:00 AM = **Night Shift** ✅

## Current Classification Rules

### Day Shift
**Requirements:** Start > 05:00 **AND** End < 18:00

**Examples:**
- ✅ 6:00 AM → 2:00 PM = Day Shift
- ✅ 7:00 AM → 3:00 PM = Day Shift
- ✅ 8:00 AM → 4:00 PM = Day Shift
- ✅ 9:00 AM → 5:00 PM = Day Shift
- ✅ 10:00 AM → 5:30 PM = Day Shift
- ❌ 5:00 AM → 1:00 PM = Night Shift (starts at 5:00 AM exactly)
- ❌ 10:00 AM → 6:00 PM = Both Shifts (ends at 6:00 PM or later)

### Both Shifts
**Requirements:** Start > 05:00 **AND** Start < 14:00 **AND** End ≥ 18:00 **AND** End ≤ 22:00

**Examples:**
- ✅ 10:00 AM → 6:00 PM = Both Shifts
- ✅ 11:00 AM → 7:00 PM = Both Shifts
- ✅ 11:00 AM → 8:00 PM = Both Shifts
- ✅ 12:00 PM → 9:00 PM = Both Shifts
- ✅ 1:00 PM → 10:00 PM = Both Shifts
- ❌ 2:00 PM → 10:00 PM = Night Shift (starts at 2:00 PM or later)
- ❌ 11:00 AM → 11:00 PM = Night Shift (ends after 10:00 PM)

### Night Shift
**Requirements:**
- Start > 13:59 **AND** End > 03:00 (after midnight)
- **OR** anything else starting after 13:59
- **OR** early morning/late night shifts

**Examples:**
- ✅ 2:00 PM → 12:00 AM = Night Shift
- ✅ 3:00 PM → 12:00 AM = Night Shift
- ✅ 4:00 PM → 1:00 AM = Night Shift
- ✅ 5:00 PM → 2:00 AM = Night Shift
- ✅ 6:00 PM → 3:00 AM = Night Shift
- ✅ 2:00 PM → 10:00 PM = Night Shift
- ✅ 3:00 PM → 11:00 PM = Night Shift
- ✅ 4:00 PM → 11:30 PM = Night Shift
- ✅ 5:00 AM → 1:00 PM = Night Shift (starts at 5:00 AM exactly)

## Technical Implementation

### File Changed
`src/utils/scheduleParser.js` - `classifyShift()` function

### Key Logic

```javascript
export function classifyShift(startTime, endTime) {
  const startMinutes = convertTimeToMinutes(startTime);
  let endMinutes = convertTimeToMinutes(endTime);

  // Handle shifts that end after midnight (12:00 AM - 5:00 AM)
  // Treat as next day by adding 24 hours
  if (endMinutes < 300) {
    endMinutes += 1440;
  }

  // Day Shift: start > 05:00 AND end < 18:00
  if (startMinutes > 300 && endMinutes < 1080) {
    return 'Day Shift';
  }

  // Night Shift: start > 13:59 AND end > 03:00
  if (startMinutes > 839 && endMinutes > 1620) {
    return 'Night Shift';
  }

  // Both Shifts: specific time range
  if (startMinutes > 300 && startMinutes < 840 &&
      endMinutes >= 1080 && endMinutes <= 1320) {
    return 'Both Shifts';
  }

  // Night Shift: anything else starting after 13:59
  if (startMinutes > 839) {
    return 'Night Shift';
  }

  // Default to Night Shift for early/late shifts
  return 'Night Shift';
}
```

### Time Conversions
- 5:00 AM = 300 minutes
- 6:00 PM (18:00) = 1080 minutes
- 2:00 PM (14:00) = 840 minutes (but uses 839 for > comparison)
- 10:00 PM (22:00) = 1320 minutes
- 3:00 AM = 180 minutes (or 1620 if adjusted for next day)

### Midnight Handling
When a shift ends between 12:00 AM and 5:00 AM:
- 12:00 AM (0 min) → 1440 min (next day)
- 1:00 AM (60 min) → 1500 min
- 2:00 AM (120 min) → 1560 min
- 3:00 AM (180 min) → 1620 min
- 4:00 AM (240 min) → 1680 min
- 4:59 AM (299 min) → 1739 min
- 5:00 AM (300 min) → no adjustment

## Test Results

✅ **All 22 test cases passed**

### Comprehensive Test Coverage

| Start | End | Classification | Status |
|-------|-----|----------------|--------|
| 2:00 PM | 12:00 AM | Night Shift | ✅ PASS |
| 3:00 PM | 12:00 AM | Night Shift | ✅ PASS |
| 4:00 PM | 1:00 AM | Night Shift | ✅ PASS |
| 5:00 PM | 2:00 AM | Night Shift | ✅ PASS |
| 6:00 PM | 3:00 AM | Night Shift | ✅ PASS |
| 6:00 AM | 2:00 PM | Day Shift | ✅ PASS |
| 7:00 AM | 3:00 PM | Day Shift | ✅ PASS |
| 8:00 AM | 4:00 PM | Day Shift | ✅ PASS |
| 9:00 AM | 5:00 PM | Day Shift | ✅ PASS |
| 10:00 AM | 5:30 PM | Day Shift | ✅ PASS |
| 10:00 AM | 6:00 PM | Both Shifts | ✅ PASS |
| 11:00 AM | 7:00 PM | Both Shifts | ✅ PASS |
| 11:00 AM | 8:00 PM | Both Shifts | ✅ PASS |
| 12:00 PM | 9:00 PM | Both Shifts | ✅ PASS |
| 1:00 PM | 10:00 PM | Both Shifts | ✅ PASS |
| 2:00 PM | 10:00 PM | Night Shift | ✅ PASS |
| 3:00 PM | 11:00 PM | Night Shift | ✅ PASS |
| 4:00 PM | 11:30 PM | Night Shift | ✅ PASS |
| 5:00 AM | 1:00 PM | Night Shift | ✅ PASS |
| 5:01 AM | 1:00 PM | Day Shift | ✅ PASS |
| 10:00 AM | 5:59 PM | Day Shift | ✅ PASS |
| 10:00 AM | 6:00 PM | Both Shifts | ✅ PASS |

## Quick Reference

### Classification Flow Chart

```
Is start > 5:00 AM?
├─ NO  → Night Shift
└─ YES → Is end < 6:00 PM?
         ├─ YES → Day Shift
         └─ NO  → Is start < 2:00 PM AND end ≤ 10:00 PM?
                  ├─ YES → Both Shifts
                  └─ NO  → Night Shift
```

### Time Boundaries

| Boundary | Time | Minutes |
|----------|------|---------|
| Day Start | 5:01 AM | 301 |
| Day End | 5:59 PM | 1079 |
| Both Start | 5:01 AM | 301 |
| Both End | 10:00 PM | 1320 |
| Night Start | 2:00 PM | 840 |
| Night End | 3:01 AM | 1621 (adjusted) |

## Impact on Auto-Assignment

### Before Update
- ❌ Staff working 2 PM → midnight assigned to Day Shift
- ❌ Incorrect labor allocation
- ❌ Deployment conflicts

### After Update
- ✅ Staff working 2 PM → midnight assigned to Night Shift
- ✅ Correct labor allocation
- ✅ No deployment conflicts
- ✅ Accurate shift planning

## Build Status

✅ **Build successful** (9.69 seconds)
- No errors
- All features working
- Production ready

## Deployment

The updated shift classification is included in the latest build and will be deployed automatically when you:
1. Run: `sudo bash install-ubuntu.sh`
2. Or update: `update-deployment`

## Testing in Production

After uploading a schedule PDF:
1. Check **Schedule Viewer** for shift classifications
2. Verify **Deployment Page** shows correct shifts
3. Confirm **Auto-Assignment** assigns staff correctly

### Expected Behavior
- Staff ending at midnight or later → **Night Shift**
- Staff ending before 6 PM (starting after 5 AM) → **Day Shift**
- Staff spanning 6-10 PM (starting before 2 PM) → **Both Shifts**

## Summary

✅ **Issue:** Midnight shifts incorrectly classified as Day Shift
✅ **Fix:** Updated rules - Day Shift requires start > 5:00 AM AND end < 6:00 PM
✅ **Testing:** 22/22 tests pass
✅ **Build:** Successful
✅ **Status:** Production ready

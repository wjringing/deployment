# KFC Shift Schedule Parser Implementation

## Overview
The KFC Shift Schedule Parser has been successfully integrated into your deployment management system. This feature allows you to upload TeamLive PDF schedules, automatically parse employee shifts, and create deployments based on predefined classification rules.

## Features Implemented

### 1. Database Schema
Created three new tables in Supabase:
- `shift_schedules` - Stores uploaded schedule metadata and raw data
- `schedule_employees` - Stores employee information from schedules
- `schedule_shifts` - Stores individual shift records with classification

### 2. PDF Processing
- **File**: `src/utils/pdfProcessor.js`
- Extracts text from PDF files using pdfjs-dist library
- Handles multi-page PDFs
- Robust error handling

### 3. Schedule Parser
- **File**: `src/utils/scheduleParser.js`
- Parses TeamLive schedule format
- Extracts employee names, roles, and shift times
- Supports multiple employee types (Cook, Team Member, Shift Runner)
- Classifies shifts based on start/end times

### 4. Shift Classification Rules
Shifts are automatically classified based on these rules:

- **Day Shift**: end_time ≤ 18:00 (6:00 PM)
- **Night Shift**: start_time > 15:00 (3:00 PM) AND end_time > 22:00 (10:00 PM)
- **Both Shifts**: start_time < 15:00 (3:00 PM) AND end_time >= 18:01 (6:01 PM) AND end_time <= 22:00 (10:00 PM)

When a shift is classified as "Both Shifts", the system automatically creates TWO deployments:
1. One for Day Shift
2. One for Night Shift

### 5. Automatic Staff Matching
- **File**: `src/utils/autoDeploymentAssignment.js`
- Matches schedule employee names to existing staff records
- Case-insensitive name matching
- Links schedule shifts to staff members

### 6. Auto-Assignment to Deployments
The system automatically:
1. Matches employees from the schedule to your staff database
2. Classifies each shift according to the rules above
3. Creates deployment records for each shift
4. Avoids duplicate deployments
5. Tracks which shifts have been assigned

### 7. User Interface Components

#### Schedule Uploader (`src/components/ScheduleUploader.jsx`)
- Drag-and-drop PDF upload interface
- Real-time processing status updates
- Success/error feedback with detailed results
- Shows auto-assignment statistics

#### Schedule Viewer (`src/components/ShiftScheduleViewer.jsx`)
- Two view modes: By Day and By Employee
- Color-coded roles (Cook, Team Member, Shift Runner)
- Role filtering
- Sortable by time
- Clean, responsive design

### 8. Navigation Integration
Added "Upload Schedule" button to the main navigation menu with Upload icon.

## How to Use

### Step 1: Prepare Your Staff Database
Ensure all staff members are added to the system with their correct names. The auto-matching is case-insensitive but requires exact name matches.

### Step 2: Upload Schedule PDF
1. Click "Upload Schedule" in the navigation menu
2. Upload your TeamLive PDF schedule
3. Wait for processing (usually 2-5 seconds)

### Step 3: Review Results
The system will show:
- Number of employees matched to staff
- Number of shifts auto-assigned
- Number of shifts skipped (no staff match)
- Any errors encountered

### Step 4: View Schedule
After upload, you can:
- View shifts by day or by employee
- Filter by role (Cook, Team Member, Shift Runner)
- See all shift details including times and classifications

### Step 5: Check Deployments
Go to the "Deployments" page to see the automatically created deployments. Each shift from the schedule has been converted to a deployment record.

## Database Integration

### Data Flow
1. PDF Upload → Text Extraction
2. Text Parsing → Structured Data
3. Database Storage → shift_schedules, schedule_employees, schedule_shifts
4. Staff Matching → Links schedule employees to staff table
5. Deployment Creation → Creates records in deployments table

### Data Retention
All schedule data is preserved in the database:
- Original parsed JSON stored in `shift_schedules.raw_data`
- Individual shifts stored with classification
- Links maintained between schedules, employees, and deployments

## Technical Details

### Dependencies Added
- `pdfjs-dist@3.11.174` - PDF text extraction

### Key Files Created
1. `/src/utils/pdfProcessor.js` - PDF text extraction
2. `/src/utils/scheduleParser.js` - Schedule parsing and classification
3. `/src/utils/autoDeploymentAssignment.js` - Staff matching and deployment creation
4. `/src/components/ScheduleUploader.jsx` - Upload interface
5. `/src/components/ShiftScheduleViewer.jsx` - Schedule display

### Database Tables
1. `shift_schedules` - Schedule metadata
2. `schedule_employees` - Employee records from schedules
3. `schedule_shifts` - Individual shift records with auto-assignment tracking

## Automatic Deployment Assignment

### Matching Process
1. System reads schedule employee names
2. Compares with staff database (case-insensitive)
3. Updates `schedule_employees.staff_id` when match found
4. Updates `schedule_shifts.staff_id` for all shifts

### Deployment Creation
1. System reads unassigned shifts from schedule
2. Classifies each shift using time-based rules
3. Creates deployment record(s) for each shift
4. Marks shift as `auto_assigned_to_deployment = true`
5. Links deployment via `schedule_shifts.deployment_id`

### Duplicate Prevention
- Checks for existing deployments before creating new ones
- Prevents duplicate deployments for same staff/date/shift combination

## Customization Options

### Employee Roles
To add/modify employee roles, edit the `employeeRoles` object in `src/utils/scheduleParser.js`.

### Shift Classification Rules
To modify shift classification logic, edit the `classifyShift` function in `src/utils/scheduleParser.js`.

### Staff Matching
For more sophisticated matching (e.g., fuzzy matching, nicknames), enhance the `matchScheduleEmployeesToStaff` function in `src/utils/autoDeploymentAssignment.js`.

## Troubleshooting

### Common Issues

**No employees matched:**
- Ensure staff names in database exactly match schedule names
- Check for extra spaces or different capitalization
- Manually add missing staff members

**Shifts not auto-assigned:**
- Check if staff matching completed successfully
- Verify shift times are in correct format
- Check for existing conflicting deployments

**PDF parsing errors:**
- Ensure PDF is from TeamLive system
- Check PDF is not password-protected
- Verify PDF contains text (not scanned images)

## Security & Data Protection

All schedule data:
- Stored securely in Supabase with RLS enabled
- Associated with upload timestamp
- Preserves original data for audit purposes
- Can be deleted along with related deployments

## Build Status

✅ Project builds successfully
✅ All dependencies installed
✅ Database migrations applied
✅ Components integrated
✅ No existing features removed

## Summary

The shift schedule parser has been fully integrated into your KFC Deployment Management System. You can now:

1. Upload TeamLive PDF schedules
2. Automatically parse employee shifts
3. Match employees to your staff database
4. Auto-create deployments based on classification rules
5. View schedules in multiple formats
6. Track all schedule data in the database

The system follows the exact classification rules you specified and creates separate deployments for day and night shifts when employees work both.
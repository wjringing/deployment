# Automated Staff Shift Deployment System

## Overview

This system automatically processes PDF schedules and categorizes employees into day shifts, night shifts, or both based on their work hours.

## Shift Classification Rules

The system uses the following time-based rules to classify shifts:

1. **Day Shift Only**: Shifts ending at or before 6:00 PM (18:00)
2. **Night Shift Only**: Shifts starting after 3:00 PM (15:00) AND ending after 10:00 PM (22:00)
3. **Both Day and Night Shifts**: Shifts starting before 3:00 PM (15:00) but ending between 6:01 PM (18:01) and 10:00 PM (22:00)

## Features

### 1. PDF Upload
- Drag-and-drop interface for PDF schedule uploads
- Automatic parsing of employee names, roles, and shift times
- Preview of parsed data before saving
- Validation and error handling

### 2. Deployment Dashboard
- Weekly calendar view of all shift deployments
- Filter by shift type (Day, Night, Both)
- Filter by role (Shift Runner, Team Member, Cook)
- Filter by specific day of the week
- Real-time statistics showing total employees and shift distributions
- Color-coded shift type indicators:
  - Yellow: Day Shift
  - Blue: Night Shift
  - Purple: Both Shifts

### 3. Historical Tracking
- View all past schedule uploads
- Detailed analytics for each uploaded week
- Shift type and role distribution breakdowns
- Daily shift count summaries
- Overall system statistics

### 4. Export Functionality
- Export to Excel (.xlsx) - Multi-sheet workbook with summary and daily breakdowns
- Export to PDF - Professional formatted report with tables
- Export to CSV - Simple comma-separated format

## Database Structure

The system uses Supabase with the following tables:

- **locations**: Restaurant locations
- **employees**: Staff members and their roles
- **schedules**: Individual shift records
- **shift_deployments**: Calculated deployment assignments
- **schedule_uploads**: Upload history and processing status
- **stations**: Training stations (for future integration)
- **employee_station_training**: Training records (for future integration)

## How to Use

### Uploading a Schedule

1. Navigate to the "Upload" page
2. Drag and drop your PDF schedule or click to browse
3. Click "Parse PDF Schedule" to extract the data
4. Review the parsed employee and shift information
5. Click "Save Schedule to Database" to store the data

### Viewing Deployments

1. Navigate to the "Dashboard" page
2. Select the week you want to view from the dropdown
3. Use filters to narrow down by shift type, role, or specific day
4. Click the "Export" button to download reports in your preferred format

### Viewing History

1. Navigate to the "History" page
2. Browse the list of past uploads on the left
3. Click on any upload to see detailed statistics
4. View shift distribution by type and role
5. See daily breakdowns for the selected week

## Future Enhancements

The system is designed to support:

- **Multi-location Management**: Switch between different restaurant locations
- **Training Tracker Integration**: Track employee certifications for different stations
- **Role-based Access Control**: Different permission levels for managers and staff
- **Advanced Analytics**: Trend analysis and reporting over time
- **Mobile Responsive Design**: Full functionality on tablets and smartphones

## Technical Details

### PDF Parsing
The system extracts text from PDFs and identifies:
- Employee names grouped by role (Shift Runner, Team Member, Cook)
- Daily shift times in "a" (AM) and "p" (PM) format
- Week start and end dates

### Time Conversion
All times are converted to 24-hour format for accurate classification:
- 12:00a = 00:00 (midnight)
- 12:00p = 12:00 (noon)
- 3:00p = 15:00
- 6:00p = 18:00
- 10:00p = 22:00

### Shift Classification Logic
The system compares start and end times against the defined thresholds to automatically assign each shift to the appropriate category, supporting the operational needs of the restaurant.

## Support

For questions or issues with the system, please review the shift classification rules above and ensure your PDF follows the expected format structure shown in the sample schedule provided.

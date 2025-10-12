import { supabase } from '../lib/supabase';

export function generateStaffCsvTemplate() {
  const headers = ['name', 'is_under_18'];
  const sampleData = [
    'John Smith,false',
    'Jane Doe,true',
    'Alice Johnson,false'
  ];

  const csvContent = [headers.join(','), ...sampleData].join('\n');
  return csvContent;
}

export function downloadStaffCsvTemplate() {
  const csvContent = generateStaffCsvTemplate();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'staff_import_template.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          reject(new Error('CSV file is empty or has no data rows'));
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const requiredHeaders = ['name'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
          reject(new Error(`Missing required columns: ${missingHeaders.join(', ')}`));
          return;
        }

        const nameIndex = headers.indexOf('name');
        const under18Index = headers.indexOf('is_under_18');

        const records = [];
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(',').map(v => v.trim());

          const name = values[nameIndex];
          if (!name || name.length === 0) {
            errors.push(`Row ${i + 1}: Name is required`);
            continue;
          }

          let isUnder18 = false;
          if (under18Index !== -1 && values[under18Index]) {
            const under18Value = values[under18Index].toLowerCase();
            if (under18Value === 'true' || under18Value === '1' || under18Value === 'yes') {
              isUnder18 = true;
            } else if (under18Value === 'false' || under18Value === '0' || under18Value === 'no' || under18Value === '') {
              isUnder18 = false;
            } else {
              errors.push(`Row ${i + 1}: is_under_18 must be true/false, yes/no, or 1/0`);
              continue;
            }
          }

          records.push({
            name,
            is_under_18: isUnder18
          });
        }

        resolve({ records, errors });
      } catch (error) {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

export async function validateStaffRecords(records) {
  const validationResults = {
    valid: [],
    duplicates: [],
    errors: []
  };

  if (records.length === 0) {
    return validationResults;
  }

  const names = records.map(r => r.name.toLowerCase());
  const uniqueNames = new Set();
  const csvDuplicates = new Set();

  names.forEach(name => {
    if (uniqueNames.has(name)) {
      csvDuplicates.add(name);
    } else {
      uniqueNames.add(name);
    }
  });

  if (csvDuplicates.size > 0) {
    validationResults.errors.push(
      `Duplicate names in CSV: ${[...csvDuplicates].join(', ')}`
    );
  }

  try {
    const { data: existingStaff, error } = await supabase
      .from('staff')
      .select('name');

    if (error) {
      validationResults.errors.push(`Database error: ${error.message}`);
      return validationResults;
    }

    const existingNames = new Set(
      (existingStaff || []).map(s => s.name.toLowerCase())
    );

    records.forEach(record => {
      if (existingNames.has(record.name.toLowerCase())) {
        validationResults.duplicates.push(record);
      } else if (!csvDuplicates.has(record.name.toLowerCase())) {
        validationResults.valid.push(record);
      }
    });

  } catch (error) {
    validationResults.errors.push(`Validation error: ${error.message}`);
  }

  return validationResults;
}

export async function importStaffRecords(records, options = {}) {
  const { updateExisting = false } = options;

  const results = {
    success: [],
    failed: [],
    updated: [],
    skipped: []
  };

  if (records.length === 0) {
    return results;
  }

  try {
    if (updateExisting) {
      for (const record of records) {
        const { data: existing, error: fetchError } = await supabase
          .from('staff')
          .select('id, name')
          .ilike('name', record.name)
          .maybeSingle();

        if (fetchError) {
          results.failed.push({ record, error: fetchError.message });
          continue;
        }

        if (existing) {
          const { data: updated, error: updateError } = await supabase
            .from('staff')
            .update({
              is_under_18: record.is_under_18,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select();

          if (updateError) {
            results.failed.push({ record, error: updateError.message });
          } else {
            results.updated.push(record);
          }
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from('staff')
            .insert([{
              name: record.name,
              is_under_18: record.is_under_18
            }])
            .select();

          if (insertError) {
            results.failed.push({ record, error: insertError.message });
          } else {
            results.success.push(record);
          }
        }
      }
    } else {
      const cleanRecords = records.map(r => ({
        name: r.name,
        is_under_18: r.is_under_18
      }));

      console.log('Importing records:', cleanRecords);

      const { data, error } = await supabase
        .from('staff')
        .insert(cleanRecords)
        .select();

      console.log('Import result:', { data, error });

      if (error) {
        console.error('Import error details:', error);
        if (error.code === '23505') {
          results.failed.push({
            record: 'batch',
            error: 'One or more names already exist. Use update mode to modify existing records.'
          });
        } else {
          results.failed.push({ record: 'batch', error: error.message });
        }
      } else {
        results.success = data || [];
      }
    }
  } catch (error) {
    results.failed.push({ record: 'batch', error: error.message });
  }

  return results;
}

export async function getStaffSummary() {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, is_under_18');

    if (error) throw error;

    return {
      total: data.length,
      under18: data.filter(s => s.is_under_18).length,
      over18: data.filter(s => !s.is_under_18).length,
      staff: data
    };
  } catch (error) {
    console.error('Failed to fetch staff summary:', error);
    return {
      total: 0,
      under18: 0,
      over18: 0,
      staff: []
    };
  }
}

export function matchStaffToScheduleEmployee(employeeName, staffList) {
  const normalizedScheduleName = employeeName.trim().toLowerCase();

  const exactMatch = staffList.find(
    staff => staff.name.trim().toLowerCase() === normalizedScheduleName
  );

  if (exactMatch) {
    return exactMatch;
  }

  const partialMatch = staffList.find(staff => {
    const staffNameLower = staff.name.trim().toLowerCase();
    return staffNameLower.includes(normalizedScheduleName) ||
           normalizedScheduleName.includes(staffNameLower);
  });

  return partialMatch || null;
}

export async function linkScheduleToStaff(scheduleData) {
  try {
    const { data: staffList, error: staffError } = await supabase
      .from('staff')
      .select('id, name, is_under_18');

    if (staffError) throw staffError;

    const linkedEmployees = scheduleData.employees.map(employee => {
      const matchedStaff = matchStaffToScheduleEmployee(employee.name, staffList);

      return {
        ...employee,
        staff_id: matchedStaff ? matchedStaff.id : null,
        matched: !!matchedStaff,
        is_under_18: matchedStaff ? matchedStaff.is_under_18 : false
      };
    });

    const matchedCount = linkedEmployees.filter(e => e.matched).length;
    const unmatchedCount = linkedEmployees.filter(e => !e.matched).length;

    return {
      employees: linkedEmployees,
      stats: {
        total: linkedEmployees.length,
        matched: matchedCount,
        unmatched: unmatchedCount,
        matchRate: linkedEmployees.length > 0
          ? ((matchedCount / linkedEmployees.length) * 100).toFixed(1)
          : 0
      }
    };
  } catch (error) {
    console.error('Failed to link schedule to staff:', error);
    throw error;
  }
}

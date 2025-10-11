// Sales Data Management System
// Processes daily sales figures in tabular format with specific parsing rules

export class SalesDataProcessor {
  constructor() {
    this.mealPeriods = ['Breakfast', 'Lunch', 'Afternoon', 'Dinner'];
    this.dayShiftStart = 6; // 6:00 AM
    this.dayShiftEnd = 16; // 4:00 PM
    this.nightShiftStart = 16; // 4:00 PM
    this.nightShiftEnd = 23; // 11:00 PM
    this.storeOpenTime = 10; // 10:00 AM
    this.storeCloseTime = 23; // 11:00 PM
  }

  /**
   * Parse pasted sales data from tabular format
   * @param {string} pastedData - Raw pasted data from clipboard
   * @returns {Object} Processed sales data with shift breakdowns
   */
  parseSalesData(pastedData) {
    if (!pastedData || typeof pastedData !== 'string') {
      throw new Error('Invalid input data');
    }

    const lines = pastedData.trim().split('\n');
    const processedData = {
      dayTotals: null,
      dayShift: [],
      nightShift: [],
      hourlyData: [],
      totalManagerForecast: 0,
      dayShiftForecast: 0,
      nightShiftForecast: 0,
      rawData: lines
    };

    console.log('Processing sales data, total lines:', lines.length);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = this.parseTableRow(line);
      console.log(`Line ${i}: "${line}" -> Columns:`, columns);
      
      if (columns.length < 3) continue;

      const timeColumn = columns[0];
      const lastYear = this.parseCurrency(columns[1]);
      const systemForecast = this.parseCurrency(columns[2]);
      
      // Extract Manager Forecast - check if it's in column 4 or on the next line
      let managerForecast = 0;
      
      if (columns.length >= 4) {
        // Manager forecast is in the same row (Day Totals case)
        managerForecast = this.parseCurrency(columns[3]);
        console.log(`Manager forecast for ${timeColumn} (same row):`, columns[3], '->', managerForecast);
      } else if (i + 1 < lines.length) {
        // Manager forecast is on the next line
        const nextLine = lines[i + 1].trim();
        const nextColumns = this.parseTableRow(nextLine);
        
        // Check if next line contains only a currency value (Manager Forecast)
        if (nextColumns.length === 1 && nextColumns[0].includes('£')) {
          managerForecast = this.parseCurrency(nextColumns[0]);
          console.log(`Manager forecast for ${timeColumn} (next line):`, nextColumns[0], '->', managerForecast);
          i++; // Skip the next line since we've processed it
        }
      }

      // Skip meal period rows
      if (this.shouldIgnoreRow(timeColumn)) {
        console.log(`Skipping meal period row: ${timeColumn}`);
        continue;
      }

      const rowData = {
        time: timeColumn,
        lastYear,
        systemForecast,
        managerForecast,
        hour: this.extractHour(timeColumn)
      };

      // Handle Day Totals row
      if (timeColumn.toLowerCase().includes('day totals')) {
        processedData.dayTotals = rowData;
        processedData.totalManagerForecast = managerForecast;
        console.log('Found day totals:', managerForecast);
        continue;
      }

      // Process hourly data
      if (rowData.hour !== null) {
        processedData.hourlyData.push(rowData);
        console.log(`Added hourly data: ${timeColumn} (${rowData.hour}h) = £${managerForecast}`);
        
        // Categorize by shift
        if (this.isDayShift(rowData.hour)) {
          processedData.dayShift.push(rowData);
          processedData.dayShiftForecast += managerForecast;
        } else if (this.isNightShift(rowData.hour)) {
          processedData.nightShift.push(rowData);
          processedData.nightShiftForecast += managerForecast;
        }
      }
    }

    console.log('Final processed data:', {
      totalRecords: processedData.hourlyData.length,
      totalForecast: processedData.totalManagerForecast,
      dayShiftForecast: processedData.dayShiftForecast,
      nightShiftForecast: processedData.nightShiftForecast
    });
    return processedData;
  }

  /**
   * Parse a table row into columns, handling various separators
   * @param {string} row - Raw table row
   * @returns {Array} Array of column values
   */
  parseTableRow(row) {
    // Handle tab-separated, pipe-separated, or multiple spaces
    let columns = [];
    
    if (row.includes('\t')) {
      columns = row.split('\t');
    } else if (row.includes('|')) {
      columns = row.split('|');
    } else {
      // Split on multiple spaces (2 or more)
      columns = row.split(/\s{2,}/);
    }

    const result = columns.map(col => col.trim()).filter(col => col.length > 0);
    console.log(`Row parsing: "${row}" -> [${result.join(', ')}]`);
    return result;
  }

  /**
   * Parse currency string to number
   * @param {string} currencyStr - Currency string (e.g., "£4,300.00")
   * @returns {number} Numeric value
   */
  parseCurrency(currencyStr) {
    if (!currencyStr || typeof currencyStr !== 'string') {
      return 0;
    }

    console.log('Parsing currency:', currencyStr);
    
    // Remove currency symbols, commas, and spaces
    const cleanStr = currencyStr.replace(/[£$€,\s]/g, '');
    const number = parseFloat(cleanStr);
    
    const result = isNaN(number) ? 0 : number;
    console.log(`Currency "${currencyStr}" -> "${cleanStr}" -> ${result}`);
    return result;
  }

  /**
   * Format number as currency
   * @param {number} amount - Numeric amount
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '£0.00';
    }

    return `£${amount.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  /**
   * Check if row should be ignored based on meal periods
   * @param {string} timeColumn - Time column value
   * @returns {boolean} True if row should be ignored
   */
  shouldIgnoreRow(timeColumn) {
    if (!timeColumn) return true;
    
    return this.mealPeriods.some(period => 
      timeColumn.toLowerCase().includes(period.toLowerCase())
    );
  }

  /**
   * Extract hour from time string
   * @param {string} timeStr - Time string (e.g., "6:00 AM", "14:00")
   * @returns {number|null} Hour in 24-hour format or null if invalid
   */
  extractHour(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') {
      return null;
    }

    // Handle various time formats
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(AM|PM)/i, // 12-hour format
      /(\d{1,2}):(\d{2})/, // 24-hour format
      /(\d{1,2})\s*(AM|PM)/i // Hour only with AM/PM
    ];

    for (const pattern of timePatterns) {
      const match = timeStr.match(pattern);
      if (match) {
        let hour = parseInt(match[1]);
        const ampm = match[3];

        if (ampm) {
          // Convert 12-hour to 24-hour format
          if (ampm.toLowerCase() === 'pm' && hour !== 12) {
            hour += 12;
          } else if (ampm.toLowerCase() === 'am' && hour === 12) {
            hour = 0;
          }
        }

        return hour;
      }
    }

    return null;
  }

  /**
   * Check if hour falls within day shift
   * @param {number} hour - Hour in 24-hour format
   * @returns {boolean} True if day shift
   */
  isDayShift(hour) {
    return hour >= this.dayShiftStart && hour < this.dayShiftEnd;
  }

  /**
   * Check if hour falls within night shift
   * @param {number} hour - Hour in 24-hour format
   * @returns {boolean} True if night shift
   */
  isNightShift(hour) {
    return hour >= this.nightShiftStart && hour <= this.nightShiftEnd;
  }

  /**
   * Check if hour falls within store operating hours
   * @param {number} hour - Hour in 24-hour format
   * @returns {boolean} True if within operating hours
   */
  isWithinOperatingHours(hour) {
    return hour >= this.storeOpenTime && hour <= this.storeCloseTime;
  }

  /**
   * Generate summary report from processed data
   * @param {Object} processedData - Data from parseSalesData
   * @returns {Object} Summary report
   */
  generateSummaryReport(processedData) {
    const report = {
      totalForecast: this.formatCurrency(processedData.totalManagerForecast),
      dayShiftForecast: this.formatCurrency(processedData.dayShiftForecast),
      nightShiftForecast: this.formatCurrency(processedData.nightShiftForecast),
      hourlyBreakdown: {
        dayShift: processedData.dayShift.map(item => ({
          time: item.time,
          forecast: this.formatCurrency(item.managerForecast)
        })),
        nightShift: processedData.nightShift.map(item => ({
          time: item.time,
          forecast: this.formatCurrency(item.managerForecast)
        }))
      },
      statistics: {
        totalHours: processedData.hourlyData.length,
        dayShiftHours: processedData.dayShift.length,
        nightShiftHours: processedData.nightShift.length,
        averageHourlyForecast: processedData.hourlyData.length > 0 
          ? this.formatCurrency(processedData.totalManagerForecast / processedData.hourlyData.length)
          : '£0.00'
      }
    };

    return report;
  }

  /**
   * Export data for integration with existing sales records system
   * @param {Object} processedData - Data from parseSalesData
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Array} Array of sales records for database insertion
   */
  exportForSalesRecords(processedData, date) {
    return processedData.hourlyData
      .filter(item => this.isWithinOperatingHours(item.hour))
      .map(item => ({
        date,
        time: this.formatTimeForDatabase(item.hour),
        forecast: item.managerForecast
      }));
  }

  /**
   * Format hour for database storage
   * @param {number} hour - Hour in 24-hour format
   * @returns {string} Time in HH:MM format
   */
  formatTimeForDatabase(hour) {
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  /**
   * Validate processed data integrity
   * @param {Object} processedData - Data from parseSalesData
   * @returns {Object} Validation results
   */
  validateData(processedData) {
    const validation = {
      isValid: true,
      warnings: [],
      errors: []
    };

    // Check if total matches sum of shifts
    const calculatedTotal = processedData.dayShiftForecast + processedData.nightShiftForecast;
    const tolerance = 0.01; // Allow for rounding differences

    if (Math.abs(calculatedTotal - processedData.totalManagerForecast) > tolerance) {
      validation.warnings.push(
        `Shift totals (${this.formatCurrency(calculatedTotal)}) don't match day total (${this.formatCurrency(processedData.totalManagerForecast)})`
      );
    }

    // Check for missing data
    if (processedData.hourlyData.length === 0) {
      validation.errors.push('No hourly data found');
      validation.isValid = false;
    }

    // Check for reasonable values
    processedData.hourlyData.forEach(item => {
      if (item.managerForecast < 0) {
        validation.warnings.push(`Negative forecast value at ${item.time}`);
      }
      if (item.managerForecast > 1000) {
        validation.warnings.push(`Unusually high forecast value at ${item.time}: ${this.formatCurrency(item.managerForecast)}`);
      }
    });

    return validation;
  }
}

// Export singleton instance for easy use
export const salesDataProcessor = new SalesDataProcessor();
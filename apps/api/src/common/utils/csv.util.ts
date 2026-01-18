/**
 * CSV parsing and formatting utilities
 */

export interface CsvParseOptions {
  skipEmptyLines?: boolean;
  trimValues?: boolean;
}

/**
 * Parse CSV string into array of string arrays
 * Handles quoted values and escaped quotes
 */
export function parseCsv(content: string, options: CsvParseOptions = {}): string[][] {
  const { skipEmptyLines = true, trimValues = true } = options;
  const rows: string[][] = [];
  let current: string[] = [];
  let value = '';
  let inQuotes = false;

  const pushValue = () => {
    current.push(trimValues ? value.trim() : value);
    value = '';
  };

  const pushRow = () => {
    if (current.length > 0 || !skipEmptyLines) {
      rows.push(current);
    }
    current = [];
  };

  // Remove BOM if present
  const text = (content || '').replace(/^\uFEFF/, '');

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      const next = text[i + 1];
      if (inQuotes && next === '"') {
        // Escaped quote
        value += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      pushValue();
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      pushValue();
      pushRow();
      // Skip additional line breaks
      while (text[i + 1] === '\n' || text[i + 1] === '\r') {
        i++;
      }
      continue;
    }

    value += ch;
  }

  // Handle remaining data
  if (value.length > 0 || current.length > 0) {
    pushValue();
    pushRow();
  }

  return rows;
}

/**
 * Convert CSV rows to array of record objects
 * First row is treated as headers
 */
export function csvToRecords(rows: string[][]): Record<string, string>[] {
  if (!rows || rows.length === 0) {
    return [];
  }

  const headers = rows[0].map(h => (h || '').trim());

  return rows.slice(1).map(row => {
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      const value = (row[idx] || '').trim();
      // Store both original case and lowercase for flexible access
      record[header] = value;
      record[header.toLowerCase()] = value;
    });
    return record;
  });
}

/**
 * Escape CSV value (add quotes if needed, escape internal quotes)
 */
export function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = typeof value === 'string' 
    ? value 
    : value instanceof Date 
      ? value.toISOString() 
      : String(value);

  const needsQuotes = /[",\n\r]/.test(str);
  const escaped = str.replace(/"/g, '""');

  return needsQuotes ? `"${escaped}"` : escaped;
}

/**
 * Convert array of records to CSV string
 */
export function recordsToCsv(records: Record<string, any>[], headers: string[]): string {
  const rows: string[] = [headers.join(',')];

  for (const record of records) {
    const values = headers.map(header => escapeCsvValue(record[header]));
    rows.push(values.join(','));
  }

  return rows.join('\n');
}

/**
 * Helper to pick first non-empty value from multiple possible field names
 */
export function pickCsvField(record: Record<string, string>, ...fieldNames: string[]): string {
  for (const name of fieldNames) {
    const value = record[name] ?? record[name.toLowerCase()];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

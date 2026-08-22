import * as XLSX from 'xlsx';
import { 
  autoAdjustLeadRow, 
  detectLeadColumnMapping, 
  inferColumnMappingFromData,
  type AutoAdjustedLead, 
  type ColumnMapping, 
  type RawLeadRow 
} from '@/lib/domain/lead-auto-adjuster';

export type SupportedFileType = 'csv' | 'xlsx' | 'xls' | 'tsv' | 'txt' | 'json';

export interface FileParseResult {
  leads: AutoAdjustedLead[];
  headers: string[];
  mapping: ColumnMapping;
  totalRows: number;
  readyCount: number;
  warningCount: number;
  invalidCount: number;
  detectedFormat: string;
  sheetNames?: string[];
  errors: string[];
}

/**
 * Auto-detect delimiter for text files (comma, tab, semicolon, pipe)
 */
export function detectDelimiter(firstLine: string): string {
  const delimiters = [',', '\t', ';', '|'];
  let bestDelimiter = ',';
  let maxCount = 0;

  for (const d of delimiters) {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i++) {
      if (firstLine[i] === '"') {
        inQuotes = !inQuotes;
      } else if (firstLine[i] === d && !inQuotes) {
        count++;
      }
    }
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = d;
    }
  }

  return bestDelimiter;
}

/**
 * Score a row of cell strings based on lead header keyword matches
 */
function scoreHeaderRow(row: any[]): number {
  if (!Array.isArray(row)) return 0;
  let score = 0;
  for (const cell of row) {
    const val = String(cell || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!val) continue;

    if (val.includes('name') || val.includes('client') || val.includes('customer') || val.includes('buyer') || val.includes('lead') || val.includes('prospect')) {
      score += 3;
    }
    if (val.includes('phone') || val.includes('mobile') || val.includes('contact') || val.includes('whatsapp') || val.includes('cell') || val.includes('calling') || val.includes('tel')) {
      score += 5;
    }
    if (val.includes('email') || val.includes('mail')) {
      score += 3;
    }
    if (val.includes('budget') || val.includes('price') || val.includes('investment') || val.includes('cost') || val.includes('amount')) {
      score += 3;
    }
    if (val.includes('bhk') || val.includes('bedroom') || val.includes('config') || val.includes('typology') || val.includes('type')) {
      score += 3;
    }
    if (val.includes('location') || val.includes('locality') || val.includes('sector') || val.includes('city') || val.includes('area') || val.includes('node') || val.includes('address')) {
      score += 3;
    }
    if (val.includes('source') || val.includes('campaign') || val.includes('utm') || val.includes('platform') || val.includes('channel')) {
      score += 2;
    }
    if (val.includes('notes') || val.includes('remark') || val.includes('comment') || val.includes('query') || val.includes('message')) {
      score += 2;
    }
  }
  return score;
}

/**
 * Parses Delimited Text (CSV, TSV, TXT with commas, tabs, semicolons, or pipes)
 */
export function parseDelimitedText(
  textContent: string,
  customMapping?: ColumnMapping
): FileParseResult {
  const rawLines = textContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length < 2) {
    return {
      leads: [],
      headers: [],
      mapping: {},
      totalRows: 0,
      readyCount: 0,
      warningCount: 0,
      invalidCount: 0,
      detectedFormat: 'text',
      errors: ['File must contain a header row and at least one lead data row.'],
    };
  }

  const delimiter = detectDelimiter(rawLines[0]);

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Find best header row among the first 10 lines
  const gridRows = rawLines.slice(0, 15).map(parseLine);
  let bestHeaderIndex = 0;
  let highestScore = 0;

  gridRows.forEach((row, idx) => {
    const score = scoreHeaderRow(row);
    if (score > highestScore) {
      highestScore = score;
      bestHeaderIndex = idx;
    }
  });

  const rawHeaders = parseLine(rawLines[bestHeaderIndex]);
  // Clean headers (remove leading/trailing spaces, newlines, asterisks)
  const headers = rawHeaders.map((h, i) => {
    const cleaned = h.replace(/[\r\n*#?]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned || `Column_${i + 1}`;
  });

  const jsonRows: RawLeadRow[] = [];
  for (let i = bestHeaderIndex + 1; i < rawLines.length; i++) {
    const values = parseLine(rawLines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;

    const rowObj: RawLeadRow = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] ?? '';
    });
    jsonRows.push(rowObj);
  }

  // Detect mapping from headers first, then infer from data values
  let mapping = customMapping || detectLeadColumnMapping(headers);
  if (!customMapping) {
    mapping = inferColumnMappingFromData(jsonRows, headers, mapping);
  }

  const leads: AutoAdjustedLead[] = [];
  let readyCount = 0;
  let warningCount = 0;
  let invalidCount = 0;

  for (const row of jsonRows) {
    const adjusted = autoAdjustLeadRow(row, mapping);
    leads.push(adjusted);

    if (adjusted.status === 'READY') readyCount++;
    else if (adjusted.status === 'WARNING') warningCount++;
    else if (adjusted.status === 'INVALID') invalidCount++;
  }

  const formatName = delimiter === '\t' ? 'TSV (Tab Separated)' : delimiter === '|' ? 'Pipe Separated Text' : delimiter === ';' ? 'Semicolon Separated Text' : 'CSV (Comma Separated)';

  return {
    leads,
    headers,
    mapping,
    totalRows: jsonRows.length,
    readyCount,
    warningCount,
    invalidCount,
    detectedFormat: formatName,
    errors: [],
  };
}

/**
 * Parses Excel Binary Buffer or Base64 (XLSX, XLS)
 */
export function parseExcelBuffer(
  buffer: ArrayBuffer | Uint8Array,
  customMapping?: ColumnMapping,
  sheetIndex = 0
): FileParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetNames = workbook.SheetNames;
    if (!sheetNames || sheetNames.length === 0) {
      return {
        leads: [],
        headers: [],
        mapping: {},
        totalRows: 0,
        readyCount: 0,
        warningCount: 0,
        invalidCount: 0,
        detectedFormat: 'Excel (.xlsx/.xls)',
        errors: ['Workbook contains no sheets.'],
      };
    }

    const selectedSheetName = sheetNames[sheetIndex] || sheetNames[0];
    const sheet = workbook.Sheets[selectedSheetName];
    
    // Extract raw 2D grid
    const rawGrid: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

    if (!rawGrid || rawGrid.length === 0) {
      return {
        leads: [],
        headers: [],
        mapping: {},
        totalRows: 0,
        readyCount: 0,
        warningCount: 0,
        invalidCount: 0,
        detectedFormat: `Excel (${selectedSheetName})`,
        sheetNames,
        errors: ['The selected Excel sheet contains no data rows.'],
      };
    }

    // Find the best header row (scan first 15 rows for header keyword matches)
    let bestHeaderRowIndex = 0;
    let highestScore = 0;

    for (let r = 0; r < Math.min(15, rawGrid.length); r++) {
      const score = scoreHeaderRow(rawGrid[r]);
      if (score > highestScore) {
        highestScore = score;
        bestHeaderRowIndex = r;
      }
    }

    const headerRow = rawGrid[bestHeaderRowIndex] || [];
    const headers = headerRow.map((h: any, colIdx: number) => {
      const clean = String(h ?? '')
        .replace(/[\r\n*#?]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return clean || `Column_${colIdx + 1}`;
    });

    const jsonRows: RawLeadRow[] = [];
    for (let r = bestHeaderRowIndex + 1; r < rawGrid.length; r++) {
      const row = rawGrid[r];
      if (!row || row.length === 0) continue;
      
      // Check if entire row is empty
      const hasAnyValue = row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim().length > 0);
      if (!hasAnyValue) continue;

      const rowObj: RawLeadRow = {};
      headers.forEach((h: string, colIdx: number) => {
        let val = row[colIdx];
        if (val === null || val === undefined) {
          val = '';
        } else if (typeof val === 'number') {
          // If phone number formatted as float e.g. 9820123456
          val = String(val);
        } else if (val instanceof Date) {
          val = val.toISOString().slice(0, 10);
        } else {
          val = String(val).trim();
        }
        rowObj[h] = val;
      });
      jsonRows.push(rowObj);
    }

    if (jsonRows.length === 0) {
      return {
        leads: [],
        headers,
        mapping: {},
        totalRows: 0,
        readyCount: 0,
        warningCount: 0,
        invalidCount: 0,
        detectedFormat: `Excel Workbook (.xlsx/.xls - Sheet: ${selectedSheetName})`,
        sheetNames,
        errors: ['No data rows found below the header row in this Excel sheet.'],
      };
    }

    // Detect mapping from headers first, then infer from data values
    let mapping = customMapping || detectLeadColumnMapping(headers);
    if (!customMapping) {
      mapping = inferColumnMappingFromData(jsonRows, headers, mapping);
    }

    const leads: AutoAdjustedLead[] = [];
    let readyCount = 0;
    let warningCount = 0;
    let invalidCount = 0;

    for (const row of jsonRows) {
      const adjusted = autoAdjustLeadRow(row, mapping);
      leads.push(adjusted);

      if (adjusted.status === 'READY') readyCount++;
      else if (adjusted.status === 'WARNING') warningCount++;
      else if (adjusted.status === 'INVALID') invalidCount++;
    }

    return {
      leads,
      headers,
      mapping,
      totalRows: jsonRows.length,
      readyCount,
      warningCount,
      invalidCount,
      detectedFormat: `Excel Workbook (.xlsx/.xls - Sheet: ${selectedSheetName})`,
      sheetNames,
      errors: [],
    };
  } catch (err: any) {
    return {
      leads: [],
      headers: [],
      mapping: {},
      totalRows: 0,
      readyCount: 0,
      warningCount: 0,
      invalidCount: 0,
      detectedFormat: 'Excel',
      errors: [`Failed to parse Excel file: ${err?.message || 'Invalid or corrupted file.'}`],
    };
  }
}

/**
 * Parses JSON File Content (Array of objects or { leads: [...] })
 */
export function parseJSONContent(
  jsonText: string,
  customMapping?: ColumnMapping
): FileParseResult {
  try {
    let parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) {
      if (Array.isArray(parsed.leads)) parsed = parsed.leads;
      else if (Array.isArray(parsed.data)) parsed = parsed.data;
      else if (Array.isArray(parsed.results)) parsed = parsed.results;
      else {
        return {
          leads: [],
          headers: [],
          mapping: {},
          totalRows: 0,
          readyCount: 0,
          warningCount: 0,
          invalidCount: 0,
          detectedFormat: 'JSON',
          errors: ['JSON must be an array of lead objects or contain a "leads" or "data" array.'],
        };
      }
    }

    if (parsed.length === 0) {
      return {
        leads: [],
        headers: [],
        mapping: {},
        totalRows: 0,
        readyCount: 0,
        warningCount: 0,
        invalidCount: 0,
        detectedFormat: 'JSON Array',
        errors: ['JSON array is empty.'],
      };
    }

    const headers = Object.keys(parsed[0]);
    let mapping = customMapping || detectLeadColumnMapping(headers);
    if (!customMapping) {
      mapping = inferColumnMappingFromData(parsed, headers, mapping);
    }

    const leads: AutoAdjustedLead[] = [];
    let readyCount = 0;
    let warningCount = 0;
    let invalidCount = 0;

    for (const row of parsed) {
      const adjusted = autoAdjustLeadRow(row, mapping);
      leads.push(adjusted);

      if (adjusted.status === 'READY') readyCount++;
      else if (adjusted.status === 'WARNING') warningCount++;
      else if (adjusted.status === 'INVALID') invalidCount++;
    }

    return {
      leads,
      headers,
      mapping,
      totalRows: parsed.length,
      readyCount,
      warningCount,
      invalidCount,
      detectedFormat: 'JSON Data',
      errors: [],
    };
  } catch (err: any) {
    return {
      leads: [],
      headers: [],
      mapping: {},
      totalRows: 0,
      readyCount: 0,
      warningCount: 0,
      invalidCount: 0,
      detectedFormat: 'JSON',
      errors: [`Invalid JSON format: ${err?.message || 'Syntax error'}`],
    };
  }
}

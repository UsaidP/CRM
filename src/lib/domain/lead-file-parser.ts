import * as XLSX from 'xlsx';
import { 
  autoAdjustLeadRow, 
  detectLeadColumnMapping, 
  inferColumnMappingFromData,
  normalizeLeadStage,
  type AutoAdjustedLead, 
  type ColumnMapping, 
  type RawLeadRow 
} from '@/lib/domain/lead-auto-adjuster';

export type SupportedFileType = 'csv' | 'xlsx' | 'xls' | 'tsv' | 'txt' | 'json' | 'jsonl' | 'html' | 'unstructured';

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
 * Auto-detect delimiter for text files (comma, tab, semicolon, pipe, caret)
 */
export function detectDelimiter(firstLine: string): string {
  const delimiters = [',', '\t', ';', '|', '^'];
  let bestDelimiter = ',';
  let maxCount = 0;

  for (const d of delimiters) {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i++) {
      const char = firstLine[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === d && !inQuotes) {
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
 * Check if a row represents actual lead data rather than column headers
 */
export function isLikelyDataRow(row: any[]): boolean {
  if (!Array.isArray(row)) return false;
  let dataSignals = 0;
  for (const cell of row) {
    const raw = String(cell || '').trim();
    if (!raw) continue;
    // Phone number pattern (10 digits or with +91)
    if (/(?:\+?91[\s-]?)?[6-9]\d{9}/.test(raw)) dataSignals += 2;
    // Email pattern
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) dataSignals += 2;
    // Budget pattern with numbers (e.g. 65L, 1.2 Cr, 50 Lakhs)
    if (/\b\d+(?:\.\d+)?\s*(?:cr|crore|lakh|l|lac)\b/i.test(raw)) dataSignals += 1;
    // BHK pattern with number (e.g. 2 BHK, 3BHK)
    if (/\b[1-5]\s*bhk\b/i.test(raw)) dataSignals += 1;
  }
  return dataSignals >= 2;
}

/**
 * Score a row of cell strings based on lead header keyword matches
 */
function scoreHeaderRow(row: any[]): number {
  if (!Array.isArray(row)) return 0;
  if (isLikelyDataRow(row)) return 0; // If row contains data signals, it is not a header!

  let score = 0;
  for (const cell of row) {
    const val = String(cell || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!val) continue;

    // Reject cells with numbers in header scoring (e.g. 9820123456, 2bhk)
    if (/\d/.test(val)) continue;

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
    if (val.includes('stage') || val.includes('status') || val.includes('pipeline') || val.includes('state')) {
      score += 3;
    }
    if (val.includes('notes') || val.includes('remark') || val.includes('comment') || val.includes('query') || val.includes('message')) {
      score += 2;
    }
  }
  return score;
}

/**
 * Universal Unstructured Text & Chat Log Lead Extractor
 * Handles: WhatsApp chat exports, Key-Value blocks, bulleted lead lines, copy-pasted CRM inquiries
 */
export function parseUnstructuredText(
  rawText: string,
  customMapping?: ColumnMapping
): FileParseResult {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return {
      leads: [],
      headers: [],
      mapping: {},
      totalRows: 0,
      readyCount: 0,
      warningCount: 0,
      invalidCount: 0,
      detectedFormat: 'Unstructured Text',
      errors: ['No text content provided.'],
    };
  }

  const rawRows: RawLeadRow[] = [];

  // Pattern A: Key-Value Blocks separated by blank lines or headers (e.g. "Name: ... \n Phone: ...")
  const isKeyValueBlock = lines.some((l) => /^(name|full name|client|customer|phone|mobile|contact|budget|bhk|location|stage|status|source|notes|remarks)\s*[:=-]/i.test(l));

  if (isKeyValueBlock) {
    let currentRecord: RawLeadRow = {};
    for (const line of lines) {
      const kvMatch = line.match(/^([^:=-]{2,30})\s*[:=-]\s*(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        const val = kvMatch[2].trim();
        currentRecord[key] = val;
      } else if (line.startsWith('---') || line.startsWith('===') || line.length === 0) {
        if (Object.keys(currentRecord).length > 0) {
          rawRows.push(currentRecord);
          currentRecord = {};
        }
      }
    }
    if (Object.keys(currentRecord).length > 0) {
      rawRows.push(currentRecord);
    }
  }

  // Pattern B: WhatsApp Chat Export Lines (e.g., "[27/08/26, 2:30 PM] +91 9820123456: Hi looking for 2 BHK in Kharghar")
  if (rawRows.length === 0) {
    const waLines = lines.filter((l) => l.includes(']') || l.includes(' - ') || /\+?91\s*[6-9]\d{9}/.test(l));
    if (waLines.length >= 1) {
      for (const line of waLines) {
        // Extract phone
        const phoneMatch = line.match(/(?:\+?91[\s-]?)?[6-9]\d{9}/);
        // Extract email
        const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        // Extract budget (e.g., "65L", "1.2 Cr", "50 Lakhs")
        const budgetMatch = line.match(/\b(?:\d+(?:\.\d+)?\s*(?:cr|crore|crores|lakh|lakhs|l|lac|lacs)|₹\s*[\d,]+)\b/i);
        // Extract BHK
        const bhkMatch = line.match(/\b([1-5])(?:\.5)?\s*(?:BHK|BED|BEDROOM)\b/i);
        // Extract Location (Kharghar / Taloja / Panvel)
        const locMatch = line.match(/\b(Kharghar(?:\s*Sec(?:tor)?\s*\d+)?|Taloja(?:\s*Phase\s*\d+)?|Panvel|Roadpali|Kalamboli|Kamothe|Navi Mumbai)\b/i);

        if (phoneMatch || emailMatch || budgetMatch || bhkMatch || locMatch) {
          // Guess name from speaker or line prefix
          let name = 'Inbound Prospect';
          const speakerMatch = line.match(/\]\s*([^:]+):/) || line.match(/-\s*([^:]+):/);
          if (speakerMatch && !speakerMatch[1].includes('+91') && !/\d{10}/.test(speakerMatch[1])) {
            name = speakerMatch[1].trim();
          }

          rawRows.push({
            'Full Name': name,
            'Mobile': phoneMatch ? phoneMatch[0] : '',
            'Email': emailMatch ? emailMatch[0] : '',
            'Budget': budgetMatch ? budgetMatch[0] : '',
            'BHK': bhkMatch ? bhkMatch[0] : '2 BHK',
            'Location': locMatch ? locMatch[0] : 'Kharghar',
            'Lead Stage': 'New Lead',
            'Source': line.toLowerCase().includes('whatsapp') ? 'WhatsApp' : 'Direct Inbound',
            'Remarks': line,
          });
        }
      }
    }
  }

  // Pattern C: Bullet points or free-form lines (e.g. "1. Amitabh Verma - 9820123456 - 2 BHK - Kharghar Sec 35 - 75L")
  if (rawRows.length === 0) {
    for (const line of lines) {
      // Split by common inline separators (dashes, commas, pipes, slashes)
      const parts = line.replace(/^\d+[\s.)-]+\s*/, '').split(/[-|,;/]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const phoneIndex = parts.findIndex((p) => /(?:\+?91[\s-]?)?[6-9]\d{9}/.test(p));
        const emailIndex = parts.findIndex((p) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p));
        const budgetIndex = parts.findIndex((p) => /\b(?:\d+(?:\.\d+)?\s*(?:cr|crore|lakh|l|lac)|₹)/i.test(p));
        const bhkIndex = parts.findIndex((p) => /\b[1-5]\s*(?:bhk|bed)/i.test(p));
        const stageIndex = parts.findIndex((p) => /\b(new|contacted|scheduled|visit|negotiat|won|lost|hold|nurture)/i.test(p));

        const name = parts[0] && phoneIndex !== 0 ? parts[0] : 'Prospect';
        const phone = phoneIndex !== -1 ? parts[phoneIndex] : '';
        const email = emailIndex !== -1 ? parts[emailIndex] : '';
        const budget = budgetIndex !== -1 ? parts[budgetIndex] : '';
        const bhk = bhkIndex !== -1 ? parts[bhkIndex] : '2 BHK';
        const stage = stageIndex !== -1 ? parts[stageIndex] : 'New Lead';
        const loc = parts.find((p, idx) => idx !== phoneIndex && idx !== emailIndex && idx !== budgetIndex && idx !== bhkIndex && idx !== stageIndex && idx !== 0) || 'Kharghar';

        rawRows.push({
          'Full Name': name,
          'Mobile': phone,
          'Email': email,
          'Budget': budget,
          'BHK': bhk,
          'Location': loc,
          'Lead Stage': stage,
          'Source': 'Unstructured Entry',
          'Remarks': line,
        });
      }
    }
  }

  if (rawRows.length === 0) {
    return {
      leads: [],
      headers: [],
      mapping: {},
      totalRows: 0,
      readyCount: 0,
      warningCount: 0,
      invalidCount: 0,
      detectedFormat: 'Unstructured Text',
      errors: ['Could not extract structured lead rows from the pasted text. Please verify format.'],
    };
  }

  const headers = Object.keys(rawRows[0]);
  let mapping = customMapping || detectLeadColumnMapping(headers);
  if (!customMapping) {
    mapping = inferColumnMappingFromData(rawRows, headers, mapping);
  }

  const leads: AutoAdjustedLead[] = [];
  let readyCount = 0;
  let warningCount = 0;
  let invalidCount = 0;

  for (const row of rawRows) {
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
    totalRows: rawRows.length,
    readyCount,
    warningCount,
    invalidCount,
    detectedFormat: isKeyValueBlock ? 'Key-Value Text Blocks' : 'Unstructured Text Extraction',
    errors: [],
  };
}

/**
 * Parses HTML Tables (e.g. copied from Google Sheets, portal dashboards, web scrapes)
 */
export function parseHTMLTable(
  htmlContent: string,
  customMapping?: ColumnMapping
): FileParseResult {
  try {
    const tableMatch = htmlContent.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
    const tableBody = tableMatch ? tableMatch[1] : htmlContent;

    const rows: string[][] = [];
    const trMatches = tableBody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);

    if (!trMatches || trMatches.length === 0) {
      // Fallback to unstructured text parser if no HTML table tags found
      return parseUnstructuredText(htmlContent.replace(/<[^>]+>/g, ' '), customMapping);
    }

    for (const tr of trMatches) {
      const cellMatches = tr.match(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi);
      if (cellMatches) {
        const rowData = cellMatches.map((cell) => {
          return cell.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        });
        if (rowData.some((c) => c.length > 0)) {
          rows.push(rowData);
        }
      }
    }

    if (rows.length < 2) {
      return parseUnstructuredText(htmlContent.replace(/<[^>]+>/g, ' '), customMapping);
    }

    // Find best header row
    let bestHeaderIndex = 0;
    let highestScore = 0;
    rows.slice(0, 10).forEach((r, idx) => {
      const score = scoreHeaderRow(r);
      if (score > highestScore) {
        highestScore = score;
        bestHeaderIndex = idx;
      }
    });

    const headers = rows[bestHeaderIndex].map((h, i) => h || `Column_${i + 1}`);
    const jsonRows: RawLeadRow[] = [];

    for (let r = bestHeaderIndex + 1; r < rows.length; r++) {
      const values = rows[r];
      const rowObj: RawLeadRow = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      jsonRows.push(rowObj);
    }

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
      detectedFormat: 'HTML Table Data',
      errors: [],
    };
  } catch (err: any) {
    return parseUnstructuredText(htmlContent, customMapping);
  }
}

/**
 * Parses Delimited Text (CSV, TSV, TXT with commas, tabs, semicolons, or pipes)
 */
export function parseDelimitedText(
  textContent: string,
  customMapping?: ColumnMapping
): FileParseResult {
  const rawLines = textContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) {
    return {
      leads: [],
      headers: [],
      mapping: {},
      totalRows: 0,
      readyCount: 0,
      warningCount: 0,
      invalidCount: 0,
      detectedFormat: 'text',
      errors: ['File contains no content.'],
    };
  }

  // Check if text is HTML Table
  if (textContent.includes('<table') || textContent.includes('<tr') || textContent.includes('<td')) {
    return parseHTMLTable(textContent, customMapping);
  }

  // Check if text is unstructured Key-Value or chat log
  if (!rawLines[0].includes(',') && !rawLines[0].includes('\t') && !rawLines[0].includes(';') && !rawLines[0].includes('|')) {
    return parseUnstructuredText(textContent, customMapping);
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

  // Find best header row among the first 15 lines
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

  // If even best score is 0 and row 0 has data (e.g. valid phone or email), generate synthetic headers
  let isHeaderless = false;
  if (highestScore === 0) {
    const firstRow = gridRows[0] || [];
    const hasPhoneOrEmail = firstRow.some((c) => /(?:\+?91[\s-]?)?[6-9]\d{9}/.test(c) || c.includes('@'));
    if (hasPhoneOrEmail) {
      isHeaderless = true;
    }
  }

  let headers: string[] = [];
  const jsonRows: RawLeadRow[] = [];

  if (isHeaderless) {
    const firstRow = gridRows[0] || [];
    headers = firstRow.map((_, i) => `Column_${i + 1}`);
    for (let i = 0; i < rawLines.length; i++) {
      const values = parseLine(rawLines[i]);
      if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
      const rowObj: RawLeadRow = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] ?? '';
      });
      jsonRows.push(rowObj);
    }
  } else {
    const rawHeaders = parseLine(rawLines[bestHeaderIndex]);
    headers = rawHeaders.map((h, i) => {
      const cleaned = h.replace(/[\r\n*#?]/g, ' ').replace(/\s+/g, ' ').trim();
      return cleaned || `Column_${i + 1}`;
    });

    for (let i = bestHeaderIndex + 1; i < rawLines.length; i++) {
      const values = parseLine(rawLines[i]);
      if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;

      const rowObj: RawLeadRow = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] ?? '';
      });
      jsonRows.push(rowObj);
    }
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

  const formatName = delimiter === '\t' 
    ? 'TSV (Tab Separated)' 
    : delimiter === '|' 
    ? 'Pipe Separated Text' 
    : delimiter === ';' 
    ? 'Semicolon Separated Text' 
    : isHeaderless 
    ? 'Headerless CSV (Auto-Mapped)' 
    : 'CSV (Comma Separated)';

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
 * Parses Excel Binary Buffer or Base64 (XLSX, XLS, XLSM, XLSB, ODS)
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
    
    // Extract raw 2D grid and filter out empty / openpyxl artifact rows
    const rawGrid: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

    const cleanGrid = (rawGrid || []).filter((row) => {
      if (!Array.isArray(row) || row.length === 0) return false;
      const hasAnyValue = row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim().length > 0);
      if (!hasAnyValue) return false;
      // Filter out openpyxl formula/cell reference rows
      const isArtifactRow = row.some((c) => /<Cell\s+['"][^'"]+['"]\.[A-Z]+\d+>/i.test(String(c)));
      return !isArtifactRow;
    });

    if (cleanGrid.length === 0) {
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

    for (let r = 0; r < Math.min(15, cleanGrid.length); r++) {
      const score = scoreHeaderRow(cleanGrid[r]);
      if (score > highestScore) {
        highestScore = score;
        bestHeaderRowIndex = r;
      }
    }

    // Check if headerless
    let isHeaderless = false;
    if (highestScore === 0) {
      if (cleanGrid.length > 1 && !isLikelyDataRow(cleanGrid[0]) && isLikelyDataRow(cleanGrid[1])) {
        bestHeaderRowIndex = 0;
        isHeaderless = false;
      } else {
        isHeaderless = true;
      }
    }

    let headers: string[] = [];
    const jsonRows: RawLeadRow[] = [];

    if (isHeaderless) {
      const firstRow = cleanGrid[0] || [];
      headers = firstRow.map((_, colIdx) => `Column_${colIdx + 1}`);
      for (let r = 0; r < cleanGrid.length; r++) {
        const row = cleanGrid[r];
        if (!row || row.length === 0) continue;

        const rowObj: RawLeadRow = {};
        headers.forEach((h: string, colIdx: number) => {
          let val = row[colIdx];
          if (val === null || val === undefined) val = '';
          else if (val instanceof Date) val = val.toISOString().slice(0, 10);
          else val = String(val).trim();
          rowObj[h] = val;
        });
        jsonRows.push(rowObj);
      }
    } else {
      const headerRow = cleanGrid[bestHeaderRowIndex] || [];
      headers = headerRow.map((h: any, colIdx: number) => {
        const clean = String(h ?? '')
          .replace(/[\r\n*#?]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return clean || `Column_${colIdx + 1}`;
      });

      for (let r = bestHeaderRowIndex + 1; r < cleanGrid.length; r++) {
        const row = cleanGrid[r];
        if (!row || row.length === 0) continue;

        const rowObj: RawLeadRow = {};
        headers.forEach((h: string, colIdx: number) => {
          let val = row[colIdx];
          if (val === null || val === undefined) {
            val = '';
          } else if (typeof val === 'number') {
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
        errors: ['No data rows found in this Excel sheet.'],
      };
    }

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
 * Parses JSON & JSONL File Content
 */
export function parseJSONContent(
  jsonText: string,
  customMapping?: ColumnMapping
): FileParseResult {
  try {
    let parsed: any[] = [];
    const trimmed = jsonText.trim();

    // Check if JSON Lines format (JSONL)
    if (trimmed.includes('\n') && !trimmed.startsWith('[')) {
      const jsonlRows = trimmed.split(/\r?\n/).filter(Boolean).map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);

      if (jsonlRows.length > 0) {
        parsed = jsonlRows;
      }
    }

    if (parsed.length === 0) {
      const obj = JSON.parse(trimmed);
      if (Array.isArray(obj)) {
        parsed = obj;
      } else if (Array.isArray(obj.leads)) {
        parsed = obj.leads;
      } else if (Array.isArray(obj.data)) {
        parsed = obj.data;
      } else if (Array.isArray(obj.results)) {
        parsed = obj.results;
      } else {
        parsed = [obj];
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
        detectedFormat: 'JSON',
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
      detectedFormat: 'JSON / JSONL Data',
      errors: [],
    };
  } catch (err: any) {
    // If JSON parsing fails, fall back to unstructured text extractor!
    return parseUnstructuredText(jsonText, customMapping);
  }
}

/**
 * Universal Master Lead Dispatcher: Detects any format and executes appropriate parsing
 */
export function parseUniversalLeadData(
  input: string | ArrayBuffer | Uint8Array,
  fileType?: string,
  customMapping?: ColumnMapping,
  sheetIndex = 0
): FileParseResult {
  if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
    return parseExcelBuffer(input, customMapping, sheetIndex);
  }

  const text = String(input || '').trim();
  if (!text) {
    return {
      leads: [],
      headers: [],
      mapping: {},
      totalRows: 0,
      readyCount: 0,
      warningCount: 0,
      invalidCount: 0,
      detectedFormat: 'Empty Input',
      errors: ['No content to parse.'],
    };
  }

  // 1. Check HTML
  if (text.includes('<table') || text.includes('<tr') || text.includes('<!DOCTYPE html')) {
    return parseHTMLTable(text, customMapping);
  }

  // 2. Check JSON
  if (text.startsWith('[') || text.startsWith('{')) {
    return parseJSONContent(text, customMapping);
  }

  // 3. Delimited Text (CSV, TSV, Semicolon, Pipe)
  return parseDelimitedText(text, customMapping);
}

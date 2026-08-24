export interface ParsedProjectRow {
  cardType?: string;
  projectName: string;
  reraNumber: string;
  developerName: string;
  microMarket: string;
  address?: string;
  subLocality?: string;
  possessionDate?: string;
  latitude?: number;
  longitude?: number;
  totalTowers?: number;
  totalFloors?: number;
  basePricePerSqft?: number;
  shortDescription?: string;
  description?: string;
}

export function parseCSVLine(line: string): string[] {
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
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseProjectsCSV(csvText: string, requireProjectCardType = true): {
  projects: ParsedProjectRow[];
  totalRows: number;
  filteredOutCount: number;
  errors: string[];
} {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { projects: [], totalRows: 0, filteredOutCount: 0, errors: ['CSV must have a header row and at least one data row.'] };
  }

  const rawHeaders = parseCSVLine(lines[0]);
  const headerMap: { [key: string]: number } = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[h.trim().toLowerCase()] = idx;
  });

  const getCol = (cols: string[], possibleNames: string[]): string | undefined => {
    for (const name of possibleNames) {
      const idx = headerMap[name.toLowerCase()];
      if (idx !== undefined && cols[idx] !== undefined) {
        return cols[idx].trim();
      }
    }
    return undefined;
  };

  const projects: ParsedProjectRow[] = [];
  const errors: string[] = [];
  let filteredOutCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length === 0 || (cols.length === 1 && cols[0] === '')) continue;

    const cardType = getCol(cols, ['cardType', 'card_type', 'type', 'listingType']);

    if (requireProjectCardType) {
      if (cardType && cardType.toLowerCase() !== 'project') {
        filteredOutCount++;
        continue;
      }
    }

    const projectName = getCol(cols, ['projectName', 'project_name', 'name', 'title', 'Project Name']);
    const reraNumber = getCol(cols, ['reraNumber', 'rera_number', 'reraId', 'rera_id', 'rera', 'RERA', 'MahaRERA ID', 'MahaRERA', 'Maha RERA ID', 'RERA ID', 'maha_rera_id']);
    const developerName = getCol(cols, ['developerName', 'developer_name', 'developer', 'builder', 'Builder Name', 'company']);
    const microMarket = getCol(cols, ['microMarket', 'micro_market', 'Micro-Market', 'micro-market', 'location', 'subLocality', 'locality', 'Address', 'city']);

    if (!projectName || projectName.trim() === '') {
      errors.push(`Row ${i + 1}: Missing project name`);
      continue;
    }

    const rawLat = getCol(cols, ['latitude', 'lat', 'Latitude']);
    const rawLng = getCol(cols, ['longitude', 'lng', 'long', 'Longitude']);
    const rawBasePrice = getCol(cols, ['basePricePerSqft', 'base_price_sqft', 'pricePerSqft', 'ratePerSqft', 'price', 'Base Price Per Sqft']);
    const rawTowers = getCol(cols, ['totalTowers', 'total_towers', 'towers', 'Total Towers', 'total towers']);
    const rawFloors = getCol(cols, ['totalFloors', 'total_floors', 'floors', 'Total Floors', 'total floors']);

    let basePricePerSqft = rawBasePrice ? parseFloat(rawBasePrice.replace(/[^0-9.]/g, '')) : undefined;
    if (basePricePerSqft && isNaN(basePricePerSqft)) basePricePerSqft = undefined;

    let latitude = rawLat ? parseFloat(rawLat) : undefined;
    if (latitude && isNaN(latitude)) latitude = undefined;

    let longitude = rawLng ? parseFloat(rawLng) : undefined;
    if (longitude && isNaN(longitude)) longitude = undefined;

    let totalTowers = rawTowers ? parseInt(rawTowers.replace(/[^0-9]/g, ''), 10) : undefined;
    if (totalTowers && isNaN(totalTowers)) totalTowers = undefined;

    let totalFloors = rawFloors ? parseInt(rawFloors.replace(/[^0-9]/g, ''), 10) : undefined;
    if (totalFloors && isNaN(totalFloors)) totalFloors = undefined;

    projects.push({
      cardType: cardType || 'project',
      projectName: projectName.trim(),
      reraNumber: (reraNumber && reraNumber.trim()) || 'P52000000000',
      developerName: (developerName && developerName.trim()) || 'Reputed Navi Mumbai Developer',
      microMarket: (microMarket && microMarket.trim()) || 'Kharghar Sector 35',
      address: getCol(cols, ['address', 'fullAddress', 'Address']),
      subLocality: getCol(cols, ['subLocality', 'sub_locality', 'sector']),
      possessionDate: getCol(cols, ['possessionDate', 'possession_date', 'possession', 'Possession Date']),
      latitude,
      longitude,
      totalTowers: totalTowers || 1,
      totalFloors: totalFloors || 15,
      basePricePerSqft: basePricePerSqft || 8500,
      shortDescription: getCol(cols, ['shortDescription', 'short_description', 'tagline']),
      description: getCol(cols, ['description', 'longDescription', 'overview']),
    });
  }

  return {
    projects,
    totalRows: lines.length - 1,
    filteredOutCount,
    errors,
  };
}

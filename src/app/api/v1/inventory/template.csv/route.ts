import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';

export const dynamic = 'force-dynamic';

const TEMPLATE_CSV_CONTENT = `cardType,Project Name,MahaRERA ID,Builder Name,Micro-Market,Address,Possession Date,Latitude,Longitude,Total Towers,Total Floors,Base Price Per Sqft,Short Description
project,Sai World Empire,P52000026796,Paradise Group,Kharghar Sector 36,"Sector 36, Upper Kharghar, Navi Mumbai 410210",2026-12-31,19.0682,73.0845,6,38,15500,"18-Acre French & Roman Themed Luxury Township with G+38 Storey Skyscraper Elevations and Valley Views."
project,Adhiraj Capital City,P52000022975,Adhiraj Constructions,Kharghar Sector 37,"Sector 37, Kharghar, Navi Mumbai 410210",2026-06-30,19.0654,73.0812,5,54,14200,"40-Acre Megacity with 54-Storey High-Rise Towers & 75,000 sq.ft. Elysium Clubhouse."
project,Crown Heights Luxury Towers,P52000018920,Crown Lifespaces,Kharghar Sector 35,"Sector 35, Kharghar, Navi Mumbai 410210",2023-08-31,19.0621,73.0789,2,22,14850,"Ready-to-Move OC 2 & 3 BHK with 0% GST, French balconies and valley views in Kharghar 35."
project,Sai Marvel Heights,P52000021450,Sai Developers,Kharghar Sector 35,"Sector 35D, Kharghar, Navi Mumbai 410210",2025-12-31,19.0635,73.0801,1,18,12500,"Modern 18-storey tower 350m from Metro Station with sample flat ready in Kharghar 35D."
project,Sai Paradise Heights,P52000015600,Paradise Group,Kharghar Sector 20,"Sector 20, Kharghar, Navi Mumbai 410210",2023-03-31,19.0520,73.0720,2,19,15800,"Ultra-luxury ready possession high-rise on Central Park Boulevard with golf course views."
project,Juhi Niharika Mirage,P52000022415,Juhi Developers,Kharghar Sector 10,"Sector 10, Kharghar, Navi Mumbai 410210",2024-06-30,19.0380,73.0670,1,14,16500,"Prime Sector 10 G+14 development with ready OC, near Utsav Chowk & Kharghar Station."
project,Crown Taloja (Lodha Crown),P51700022900,Lodha Group,Taloja Phase 1,"Sector 2, Taloja Phase 1, Navi Mumbai 410208",2025-03-31,19.0720,73.1150,12,14,8500,"Ready OC 1 & 2 BHK Residences by Lodha with 0% GST and 20,000 sq.ft. Club House in Taloja Phase 1."
project,Galaxy Metro Heights,P52000019800,Galaxy Builders,Taloja Phase 1,"Sector 11, Taloja Phase 1, Navi Mumbai 410208",2025-06-30,19.0700,73.1120,3,16,7900,"3-Tower gated community 250m from Taloja Metro Terminal with podium parking in Taloja 1."
project,Arihant Clan Aalishan,P52000006391,Arihant Superstructures Ltd,Taloja Phase 2,"Sector 26, Taloja Phase 2, Navi Mumbai 410208",2026-09-30,19.0550,73.1020,4,53,9800,"Persian-Themed 53-Storey Luxury Towers with Persian Hammam Clubhouse in Taloja Phase 2."
project,Kamdhenu Oaklands,P52000024500,Kamdhenu Realities,Taloja Phase 2,"Sector 26, Taloja Phase 2, Navi Mumbai 410208",2026-03-31,19.0560,73.1040,2,22,9200,"G+22 Storey Twin Towers with landscaped podium in Taloja Phase 2 Kharghar Annex."
`;

export async function GET(req: Request) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  return new NextResponse(TEMPLATE_CSV_CONTENT.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="zamzam_kharghar_taloja_projects_template.csv"',
    },
  });
}

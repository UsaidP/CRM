import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';

export const dynamic = 'force-dynamic';

const SAMPLE_LEADS_CSV = `Full Name,Mobile Number,Email,Budget,BHK Requirement,Preferred Location,Lead Source,Possession,Lead Stage,Remarks
Amitabh Verma,09820123456,amitabh.verma@example.com,65L to 80L,2 BHK,Kharghar Sector 35,Meta Ads,Ready to Move,New Lead,"Looking for 2 BHK near Metro with hill view."
Pooja Nair,9819054321,pooja.nair@example.com,1.25 Cr,3 BHK,Kharghar Sector 36,Google Ads,Under Construction,Site Visit Scheduled,"Interested in Sai World Empire luxury township."
Rajesh Kulkarni,+91 9820098765,rajesh.k@example.com,45-55 Lakhs,1 or 2 BHK,Taloja Phase 1,99acres,Ready to Move,Discovery Call,"Budget buyer looking for Lodha Crown or near Metro."
Sneha Deshmukh,9967712345,,75 Lacs,2 BHK,Kharghar Sector 20,MagicBricks,Ready to Move,Negotiation,"Needs OC received flat near Central Park Boulevard."
Vikramaditya Rao,9769011223,vikram.rao@example.com,1.8 Cr,3 BHK + Study,Upper Kharghar 37,YouTube,Under Construction,Portal Shared,"High floor requirement in Adhiraj Capital City."
Farhan Shaikh,09833456789,farhan.s@example.com,₹50,00,000,2 BHK,Taloja Phase 2,Facebook Group,Under Construction,New Lead,"Persian-themed tower inquiry (Arihant Clan Aalishan)."
`;

export async function GET(req: Request) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  return new NextResponse(SAMPLE_LEADS_CSV.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="zamzam_leads_import_template.csv"',
    },
  });
}

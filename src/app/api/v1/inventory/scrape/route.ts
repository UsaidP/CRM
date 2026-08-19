import { NextRequest, NextResponse } from 'next/server';
import { 
  VERIFIED_NAVI_MUMBAI_PROJECTS, 
  scrapeAndIngestProjects 
} from '@/lib/domain/property-scraper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const microMarket = searchParams.get('microMarket') || 'ALL';

    const filtered = VERIFIED_NAVI_MUMBAI_PROJECTS.filter((p) => {
      if (microMarket === 'ALL') return true;
      if (microMarket === 'KHARGHAR') return p.microMarket.toLowerCase().includes('kharghar');
      if (microMarket === 'TALOJA') return p.microMarket.toLowerCase().includes('taloja');
      return p.microMarket.toLowerCase().includes(microMarket.toLowerCase());
    });

    return NextResponse.json({
      success: true,
      totalAvailable: filtered.length,
      microMarket,
      data: filtered,
    });
  } catch (error: any) {
    console.error('Error fetching scraped project catalog:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch scraped projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const microMarketFilter = body.microMarketFilter || 'ALL';
    const organizationId = body.organizationId;
    const verifiedByUserId = body.verifiedByUserId;

    const result = await scrapeAndIngestProjects({
      microMarketFilter,
      organizationId,
      verifiedByUserId,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully scraped and ingested ${result.ingestedCount} projects into CRM database.`,
      ...result,
    });
  } catch (error: any) {
    console.error('Error running scrape and ingestion:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to run property scraping job' },
      { status: 500 }
    );
  }
}

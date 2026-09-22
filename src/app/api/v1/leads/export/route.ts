import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requirePermissionWithScope, scopedLeadFilter } from '@/lib/services/api-auth';
import { handleApiError } from '@/lib/services/api-handler';
import { formatINR } from '@/lib/export-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function escapeCsv(cell: unknown): string {
  if (cell === null || cell === undefined) return '""';
  let str = String(cell).trim();
  // Neutralize CSV / formula injection for spreadsheet applications (=, +, -, @, tab, CR)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function parseJsonArray(jsonStr: string | null | undefined): string[] {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requirePermissionWithScope(req, 'leads:view_all');
    if (!auth.ok) return auth.response;
    const { session, scope } = auth;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view');
    const leadSource = searchParams.get('leadSource');
    const currentStage = searchParams.get('currentStage');
    const brokerId = searchParams.get('brokerId');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const maxLimit = Math.min(10000, Math.max(1, parseInt(searchParams.get('limit') || '5000', 10) || 5000));

    // Scope-aware tenant & RBAC filter
    const baseScopeWhere = await scopedLeadFilter(session, scope);
    const where: Record<string, unknown> = { ...baseScopeWhere };

    if (view === 'mine') {
      where.OR = [
        { assignedBrokerId: session.userId },
        { assignments: { some: { userId: session.userId, unassignedAt: null } } },
      ];
    }

    if (leadSource && leadSource !== 'ALL') {
      where.leadSource = leadSource;
    }
    if (brokerId && brokerId !== 'ALL') {
      where.assignedBrokerId = brokerId;
    }
    if (currentStage && currentStage !== 'ALL') {
      where.currentStage = currentStage;
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { phoneE164: { contains: search } },
        { email: { contains: search } },
        { notes: { contains: search } },
        { sourceCode: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      const createdAtFilter: Record<string, Date> = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) createdAtFilter.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          createdAtFilter.lte = end;
        }
      }
      if (Object.keys(createdAtFilter).length > 0) {
        where.createdAt = createdAtFilter;
      }
    }

    // Fetch leads for export with standard relations
    const leads = await prisma.lead.findMany({
      relationLoadStrategy: 'join',
      where,
      take: maxLimit,
      include: {
        contact: {
          include: {
            identities: true,
          },
        },
        campaign: {
          select: {
            campaignName: true,
            channelType: true,
            sourceCode: true,
          },
        },
        assignedBroker: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneE164: true,
          },
        },
        requirements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        count: leads.length,
        data: leads,
      });
    }

    // Generate CSV
    const headers = [
      'Lead ID',
      'Full Name',
      'Phone (E.164)',
      'Email',
      'City',
      'Contact Primary Name',
      'Lead Source',
      'Source Confidence',
      'Campaign Tag',
      'Current Stage',
      'Preferred BHK',
      'Preferred Locations',
      'Possession Preference',
      'Min Budget (INR)',
      'Max Budget (INR)',
      'Max Budget Formatted',
      'Assigned Advisor',
      'Advisor Email',
      'Created Date',
      'Notes',
    ];

    const rows = leads.map((lead) => {
      const req = lead.requirements?.[0];
      const maxBudget = req?.budgetMax ?? 0;
      const minBudget = req?.budgetMin ?? 0;
      const bhks = parseJsonArray(req?.bhkPreferencesJson);
      const bhkStr = bhks.length > 0 ? bhks.map((b) => `${b} BHK`).join(' / ') : '';
      const locations = parseJsonArray(req?.targetLocationsJson).join('; ');
      const possession = req?.possessionPreference || '';
      const advisorName = lead.assignedBroker?.fullName || 'Unassigned';
      const advisorEmail = lead.assignedBroker?.email || '';
      const createdDate = lead.createdAt
        ? new Date(lead.createdAt).toISOString().replace('T', ' ').slice(0, 19)
        : '';

      return [
        lead.id,
        lead.fullName || '',
        lead.phoneE164 || '',
        lead.email || '',
        lead.city || 'Navi Mumbai',
        lead.contact?.primaryName || '',
        lead.leadSource || 'ORGANIC',
        lead.sourceConfidence || 'UNKNOWN',
        lead.sourceCode || lead.campaign?.sourceCode || '',
        lead.currentStage || 'new_uncontacted',
        bhkStr,
        locations,
        possession,
        minBudget,
        maxBudget,
        formatINR(maxBudget),
        advisorName,
        advisorEmail,
        createdDate,
        lead.notes || '',
      ].map(escapeCsv).join(',');
    });

    // UTF-8 BOM prefix (\uFEFF) ensures Excel properly decodes Unicode characters
    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `crm_customers_export_${timestamp}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/v1/leads/export');
  }
}

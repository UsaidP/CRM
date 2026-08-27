import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { 
  parseExcelBuffer, 
  parseDelimitedText, 
  parseJSONContent, 
  type FileParseResult 
} from '@/lib/domain/lead-file-parser';
import { type ColumnMapping } from '@/lib/domain/lead-auto-adjuster';
import { findOrCreateContact } from '@/lib/domain/contact-manager';
import { ensureLeadFallbackReminder } from '@/lib/services/lead-reminder-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;
    const contentType = request.headers.get('content-type') || '';
    let customMapping: ColumnMapping | undefined;
    let organizationId = '';
    let parseResult: FileParseResult | null = null;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const content = body.content || body.csvText || '';
      const base64Data = body.base64Data || '';
      const fileType = (body.fileType || 'csv').toLowerCase();
      customMapping = body.mapping;
      organizationId = body.organizationId || '';

      if (fileType === 'xlsx' || fileType === 'xls' || base64Data) {
        const rawBuffer = Buffer.from(base64Data || content, 'base64');
        parseResult = parseExcelBuffer(rawBuffer, customMapping, body.sheetIndex || 0);
      } else if (fileType === 'json' || content.trim().startsWith('[') || content.trim().startsWith('{')) {
        parseResult = parseJSONContent(content, customMapping);
      } else {
        parseResult = parseDelimitedText(content, customMapping);
      }
    } else {
      // Multipart Form Data (File upload)
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const content = (formData.get('content') as string) || (formData.get('csvText') as string) || '';
      const mappingRaw = formData.get('mapping') as string | null;
      if (mappingRaw) {
        try {
          customMapping = JSON.parse(mappingRaw);
        } catch {
          // ignore error
        }
      }
      organizationId = (formData.get('organizationId') as string) || '';

      if (file) {
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          const arrayBuffer = await file.arrayBuffer();
          parseResult = parseExcelBuffer(arrayBuffer, customMapping);
        } else if (fileName.endsWith('.json')) {
          const jsonText = await file.text();
          parseResult = parseJSONContent(jsonText, customMapping);
        } else {
          // .csv, .tsv, .txt
          const text = await file.text();
          parseResult = parseDelimitedText(text, customMapping);
        }
      } else if (content.trim()) {
        if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
          parseResult = parseJSONContent(content, customMapping);
        } else {
          parseResult = parseDelimitedText(content, customMapping);
        }
      }
    }

    if (!parseResult || (parseResult.leads.length === 0 && parseResult.errors.length > 0)) {
      return NextResponse.json(
        { 
          success: false, 
          error: parseResult?.errors.join(', ') || 'No valid lead data found. Please upload a valid CSV, Excel (.xlsx/.xls), TSV, TXT, or JSON file.' 
        },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json(
        { success: false, error: 'No active CRM organization found.' },
        { status: 400 }
      );
    }

    // Cache brokers for quick assignment lookup
    const brokers = await prisma.user.findMany({
      where: { organizationId: org.id },
      include: { phoneNumbers: true },
    });

    const findBroker = (phoneE164: string) => {
      const clean = phoneE164.replace(/\D/g, '');
      const match = brokers.find((b) => {
        const bPhone = (b.phoneE164 || '').replace(/\D/g, '');
        const hasNumberMatch = b.phoneNumbers.some((pn) => pn.e164.replace(/\D/g, '').includes(clean));
        return bPhone.includes(clean) || hasNumberMatch;
      });
      return match || brokers[0] || null;
    };

    let createdLeadsCount = 0;
    let newContactsCount = 0;
    let existingContactsCount = 0;
    let invalidCount = 0;

    const importedLeadRecords = [];

    for (const lead of parseResult.leads) {
      if (lead.status === 'INVALID' && !lead.phoneE164 && !lead.email) {
        invalidCount++;
        continue;
      }

      // 1. Resolve Assigned Broker
      const assignedBroker = findBroker(lead.assignedBrokerPhone);

      // 2. Find or Create Durable Contact (Deduplication)
      const initialContactCount = await prisma.contact.count({ where: { organizationId: org.id } });

      const contact = await findOrCreateContact({
        organizationId: org.id,
        fullName: lead.fullName,
        phoneE164: lead.phoneE164 || undefined,
        email: lead.email || undefined,
        assignedBrokerId: assignedBroker?.id,
        notes: lead.notes,
      });

      const afterContactCount = await prisma.contact.count({ where: { organizationId: org.id } });
      if (afterContactCount > initialContactCount) {
        newContactsCount++;
      } else {
        existingContactsCount++;
      }

      // 3. Create Lead Record
      const createdLead = await prisma.lead.create({
        data: {
          organizationId: org.id,
          contactId: contact?.id || null,
          fullName: lead.fullName,
          phoneE164: lead.phoneE164 || null,
          email: lead.email || null,
          city: 'Navi Mumbai',
          leadSource: lead.leadSource,
          sourceConfidence: lead.sourceConfidence,
          inboundNumber: lead.assignedBrokerPhone,
          assignedBrokerId: assignedBroker?.id || null,
          currentStage: 'new_uncontacted',
          notes: lead.notes,
          lastInboundMessageAt: new Date(),
          requirements: {
            create: {
              budgetMin: lead.budgetMin || null,
              budgetMax: lead.budgetMax || 7000000,
              bhkPreferencesJson: JSON.stringify(lead.bhkPreferences),
              targetLocationsJson: JSON.stringify(lead.targetLocations),
              possessionPreference: lead.possessionPreference !== 'ANY' ? lead.possessionPreference : null,
              loanPreApproved: false,
              purpose: 'self_use',
              isActive: true,
            },
          },
        },
        include: {
          contact: {
            include: { identities: true },
          },
          requirements: true,
          assignedBroker: {
            select: { id: true, fullName: true, phoneE164: true },
          },
        },
      });

      // Auto-seed initial outreach reminder for imported lead
      await ensureLeadFallbackReminder(createdLead.id, {
        organizationId: org.id,
      });

      createdLeadsCount++;
      importedLeadRecords.push(createdLead);
    }

    return NextResponse.json({
      success: true,
      message: `Lead Import completed: ${createdLeadsCount} leads processed from ${parseResult.detectedFormat} (${newContactsCount} new contacts, ${existingContactsCount} existing contacts matched, ${invalidCount} invalid rows skipped).`,
      stats: {
        detectedFormat: parseResult.detectedFormat,
        totalRows: parseResult.totalRows,
        createdLeadsCount,
        newContactsCount,
        existingContactsCount,
        invalidCount,
      },
      leads: importedLeadRecords,
    });
  } catch (error: any) {
    console.error('Error importing leads file:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process lead file import.' },
      { status: 500 }
    );
  }
}

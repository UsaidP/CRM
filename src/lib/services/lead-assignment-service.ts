/**
 * Lead Assignment Service
 *
 * Manages the lifecycle of lead-to-user assignments with full audit trail.
 * Every assignment/reassignment is tracked in the LeadAssignment table
 * while Lead.assignedBrokerId stays as the current denormalized owner.
 */

import { prisma } from '@/lib/db/prisma';

export type AssignmentType = 'DIRECT' | 'ROUND_ROBIN' | 'MANUAL_REASSIGN' | 'ESCALATION';

export interface AssignLeadInput {
  leadId: string;
  userId: string;
  assignedById?: string;
  assignmentType?: AssignmentType;
  notes?: string;
}

/**
 * Assign a lead to a user. Closes any active previous assignment
 * and creates a new one. Updates the denormalized Lead.assignedBrokerId.
 */
export async function assignLead(input: AssignLeadInput) {
  const { leadId, userId, assignedById, assignmentType = 'DIRECT', notes } = input;

  const now = new Date();

  // Close any currently active assignment for this lead
  await prisma.leadAssignment.updateMany({
    where: {
      leadId,
      unassignedAt: null,
    },
    data: {
      unassignedAt: now,
    },
  });

  // Create new assignment record
  const assignment = await prisma.leadAssignment.create({
    data: {
      leadId,
      userId,
      assignedById: assignedById || null,
      assignedAt: now,
      assignmentType,
      notes: notes || null,
    },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, role: true },
      },
      assignedBy: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
  });

  // Update the denormalized field on Lead
  await prisma.lead.update({
    where: { id: leadId },
    data: { assignedBrokerId: userId },
  });

  return assignment;
}

/**
 * Reassign a lead from the current owner to a new user.
 * Creates full audit trail entry.
 */
export async function reassignLead(
  leadId: string,
  newUserId: string,
  assignedById: string,
  notes?: string
) {
  return assignLead({
    leadId,
    userId: newUserId,
    assignedById,
    assignmentType: 'MANUAL_REASSIGN',
    notes,
  });
}

/**
 * Get the full assignment history for a lead, newest first.
 */
export async function getAssignmentHistory(leadId: string) {
  return prisma.leadAssignment.findMany({
    where: { leadId },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, role: true },
      },
      assignedBy: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });
}

/**
 * Get the current active assignment for a lead.
 */
export async function getActiveAssignment(leadId: string) {
  return prisma.leadAssignment.findFirst({
    where: {
      leadId,
      unassignedAt: null,
    },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, role: true },
      },
      assignedBy: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
  });
}

/**
 * Backfill assignment records from existing Lead.assignedBrokerId values.
 * Used during migration to create initial assignment history.
 */
export async function backfillAssignmentsFromLeads(organizationId: string) {
  const leads = await prisma.lead.findMany({
    where: {
      organizationId,
      assignedBrokerId: { not: null },
    },
    select: { id: true, assignedBrokerId: true, createdAt: true },
  });

  let created = 0;
  for (const lead of leads) {
    if (!lead.assignedBrokerId) continue;

    // Check if an assignment already exists
    const existing = await prisma.leadAssignment.findFirst({
      where: { leadId: lead.id },
    });

    if (!existing) {
      await prisma.leadAssignment.create({
        data: {
          leadId: lead.id,
          userId: lead.assignedBrokerId,
          assignedAt: lead.createdAt,
          assignmentType: 'DIRECT',
          notes: 'Backfilled from existing lead assignment',
        },
      });
      created++;
    }
  }

  return { total: leads.length, created };
}

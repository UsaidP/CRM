/**
 * Team Management Service
 *
 * CRUD operations for teams and team membership.
 * Only Admins+ can create teams and add users.
 * Single team per user — enforced at this layer.
 */

import { prisma } from '@/lib/db/prisma';

export interface CreateTeamInput {
  organizationId: string;
  name: string;
  description?: string;
  managerId?: string;
}

export async function createTeam(input: CreateTeamInput) {
  const { organizationId, name, description, managerId } = input;

  // Validate manager exists and has MANAGER role if provided
  if (managerId) {
    const manager = await prisma.user.findFirst({
      where: { id: managerId, organizationId, isActive: true },
    });
    if (!manager) {
      throw new Error('Manager user not found in this organization');
    }
    if (manager.role !== 'MANAGER' && manager.role !== 'ADMIN' && manager.role !== 'SUPER_ADMIN') {
      throw new Error('The designated manager must have at least a MANAGER role');
    }
  }

  return prisma.team.create({
    data: {
      organizationId,
      name: name.trim(),
      description: description?.trim() || null,
      managerId: managerId || null,
    },
    include: {
      members: {
        select: { id: true, fullName: true, email: true, role: true, isActive: true },
      },
    },
  });
}

export async function updateTeam(
  teamId: string,
  organizationId: string,
  updates: { name?: string; description?: string; managerId?: string | null; isActive?: boolean }
) {
  return prisma.team.update({
    where: { id: teamId },
    data: {
      ...(updates.name !== undefined && { name: updates.name.trim() }),
      ...(updates.description !== undefined && { description: updates.description?.trim() || null }),
      ...(updates.managerId !== undefined && { managerId: updates.managerId }),
      ...(updates.isActive !== undefined && { isActive: updates.isActive }),
    },
    include: {
      members: {
        select: { id: true, fullName: true, email: true, role: true, isActive: true },
      },
    },
  });
}

/**
 * Add a user to a team. Enforces single-team-per-user.
 * Removes the user from their current team (if any) before adding.
 */
export async function addTeamMember(teamId: string, userId: string, organizationId: string) {
  // Verify team exists in this org
  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId, isActive: true },
  });
  if (!team) throw new Error('Team not found');

  // Verify user exists in this org
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId, isActive: true },
  });
  if (!user) throw new Error('User not found');

  // Update user's teamId (single-team enforcement)
  return prisma.user.update({
    where: { id: userId },
    data: { teamId },
    select: { id: true, fullName: true, email: true, role: true, teamId: true },
  });
}

/**
 * Remove a user from their team by clearing teamId.
 */
export async function removeTeamMember(userId: string, organizationId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });
  if (!user) throw new Error('User not found');

  return prisma.user.update({
    where: { id: userId },
    data: { teamId: null },
    select: { id: true, fullName: true, email: true, role: true, teamId: true },
  });
}

export async function getTeamsByOrg(organizationId: string) {
  return prisma.team.findMany({
    where: { organizationId },
    include: {
      members: {
        select: { id: true, fullName: true, email: true, role: true, isActive: true, phoneE164: true },
        orderBy: { fullName: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getTeamById(teamId: string, organizationId: string) {
  return prisma.team.findFirst({
    where: { id: teamId, organizationId },
    include: {
      members: {
        select: { id: true, fullName: true, email: true, role: true, isActive: true, phoneE164: true },
        orderBy: { fullName: 'asc' },
      },
    },
  });
}

/**
 * Returns all user IDs belonging to the same team as the given user.
 * Used by TEAM-scoped queries to filter records.
 */
export async function getTeamMemberIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { teamId: true },
  });

  if (!user?.teamId) return [userId]; // No team → only see own records

  const members = await prisma.user.findMany({
    where: { teamId: user.teamId, isActive: true },
    select: { id: true },
  });

  return members.map((m) => m.id);
}

export async function deleteTeam(teamId: string, organizationId: string) {
  // First, remove all users from this team
  await prisma.user.updateMany({
    where: { teamId },
    data: { teamId: null },
  });

  return prisma.team.delete({
    where: { id: teamId },
  });
}

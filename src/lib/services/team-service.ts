/**
 * Team Management Service
 *
 * CRUD operations for custom teams and team membership.
 * Only Admins and Super Admins can create/manage custom teams and assign users.
 * Single team per user — enforced at this layer.
 */

import { prisma } from '@/lib/db/prisma';

export interface CreateTeamInput {
  organizationId: string;
  name: string;
  description?: string;
  managerId?: string;
  memberIds?: string[];
}

export async function createTeam(input: CreateTeamInput) {
  const { organizationId, name, description, managerId, memberIds } = input;

  // Validate manager exists and has MANAGER or ADMIN role if provided
  if (managerId) {
    const manager = await prisma.user.findFirst({
      where: { id: managerId, organizationId, isActive: true },
    });
    if (!manager) {
      throw new Error('Manager user not found in this organization');
    }
    if (manager.role !== 'MANAGER' && manager.role !== 'ADMIN' && manager.role !== 'SUPER_ADMIN') {
      throw new Error('The designated team manager must have at least a MANAGER, ADMIN, or SUPER_ADMIN role');
    }
  }

  const team = await prisma.team.create({
    data: {
      organizationId,
      name: name.trim(),
      description: description?.trim() || null,
      managerId: managerId || null,
    },
  });

  if (memberIds && memberIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: memberIds }, organizationId },
      data: { teamId: team.id },
    });
  }

  return getTeamById(team.id, organizationId);
}

export async function updateTeam(
  teamId: string,
  organizationId: string,
  updates: {
    name?: string;
    description?: string;
    managerId?: string | null;
    isActive?: boolean;
    memberIds?: string[];
  }
) {
  const existing = await prisma.team.findFirst({
    where: { id: teamId, organizationId },
  });
  if (!existing) throw new Error('Team not found in this organization');

  if (updates.managerId) {
    const manager = await prisma.user.findFirst({
      where: { id: updates.managerId, organizationId, isActive: true },
    });
    if (!manager) {
      throw new Error('Manager user not found in this organization');
    }
    if (manager.role !== 'MANAGER' && manager.role !== 'ADMIN' && manager.role !== 'SUPER_ADMIN') {
      throw new Error('The designated team manager must have at least a MANAGER, ADMIN, or SUPER_ADMIN role');
    }
  }

  await prisma.team.update({
    where: { id: teamId },
    data: {
      ...(updates.name !== undefined && { name: updates.name.trim() }),
      ...(updates.description !== undefined && { description: updates.description?.trim() || null }),
      ...(updates.managerId !== undefined && { managerId: updates.managerId }),
      ...(updates.isActive !== undefined && { isActive: updates.isActive }),
    },
  });

  if (updates.memberIds !== undefined) {
    // Unassign members currently in this team who are not in the new memberIds list
    await prisma.user.updateMany({
      where: {
        teamId,
        id: { notIn: updates.memberIds },
        organizationId,
      },
      data: { teamId: null },
    });

    // Assign new members to this team
    if (updates.memberIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: updates.memberIds }, organizationId },
        data: { teamId },
      });
    }
  }

  return getTeamById(teamId, organizationId);
}

/**
 * Add a user to a team. Enforces single-team-per-user.
 * Removes the user from their current team (if any) before adding.
 */
export async function addTeamMember(teamId: string, userId: string, organizationId: string) {
  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId, isActive: true },
  });
  if (!team) throw new Error('Team not found');

  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId, isActive: true },
  });
  if (!user) throw new Error('User not found');

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
  const teams = await prisma.team.findMany({
    where: { organizationId },
    include: {
      members: {
        select: { id: true, fullName: true, email: true, role: true, isActive: true, phoneE164: true },
        orderBy: { fullName: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const managerIds = teams.map((t) => t.managerId).filter((id): id is string => Boolean(id));
  const managers = managerIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: managerIds }, organizationId },
        select: { id: true, fullName: true, email: true, role: true, phoneE164: true },
      })
    : [];

  const managerMap = new Map(managers.map((m) => [m.id, m]));

  return teams.map((team) => ({
    ...team,
    manager: team.managerId ? managerMap.get(team.managerId) || null : null,
  }));
}

export async function getTeamById(teamId: string, organizationId: string) {
  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId },
    include: {
      members: {
        select: { id: true, fullName: true, email: true, role: true, isActive: true, phoneE164: true },
        orderBy: { fullName: 'asc' },
      },
    },
  });

  if (!team) return null;

  let manager = null;
  if (team.managerId) {
    manager = await prisma.user.findFirst({
      where: { id: team.managerId, organizationId },
      select: { id: true, fullName: true, email: true, role: true, phoneE164: true },
    });
  }

  return {
    ...team,
    manager,
  };
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
  // Unassign all users in this team
  await prisma.user.updateMany({
    where: { teamId, organizationId },
    data: { teamId: null },
  });

  return prisma.team.delete({
    where: { id: teamId },
  });
}

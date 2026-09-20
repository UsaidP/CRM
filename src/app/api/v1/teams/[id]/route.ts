import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/services/api-auth';
import { getTeamById, updateTeam, deleteTeam } from '@/lib/services/team-service';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(req, [...ADMIN_ROLES, 'MANAGER']);
    if (!auth.ok) return auth.response;
    const { session } = auth;

    const { id: teamId } = await params;
    const team = await getTeamById(teamId, session.organizationId);

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      team,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(req, [...ADMIN_ROLES]);
    if (!auth.ok) return auth.response;
    const { session } = auth;

    const { id: teamId } = await params;
    const body = await req.json();
    const { name, description, managerId, isActive, memberIds } = body;

    const updatedTeam = await updateTeam(teamId, session.organizationId, {
      name,
      description,
      managerId,
      isActive,
      memberIds,
    });

    return NextResponse.json({
      success: true,
      team: updatedTeam,
      message: `Team "${updatedTeam?.name || 'custom squad'}" updated successfully.`,
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Another team with this name already exists in your organization.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update team' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(req, [...ADMIN_ROLES]);
    if (!auth.ok) return auth.response;
    const { session } = auth;

    const { id: teamId } = await params;

    await deleteTeam(teamId, session.organizationId);

    return NextResponse.json({
      success: true,
      message: 'Custom team deleted successfully. Team members have been unassigned.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete team' },
      { status: 500 }
    );
  }
}

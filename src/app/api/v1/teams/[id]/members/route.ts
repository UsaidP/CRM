import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/services/api-auth';
import { addTeamMember, removeTeamMember, getTeamById } from '@/lib/services/team-service';

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
      members: team.members,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(req, [...ADMIN_ROLES]);
    if (!auth.ok) return auth.response;
    const { session } = auth;

    const { id: teamId } = await params;
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const updatedUser = await addTeamMember(teamId, userId, session.organizationId);

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User assigned to team successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to add team member' },
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

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const updatedUser = await removeTeamMember(userId, session.organizationId);

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User removed from team successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to remove team member' },
      { status: 500 }
    );
  }
}

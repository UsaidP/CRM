import { NextResponse } from 'next/server';
import { requireRole, orgScope } from '@/lib/services/api-auth';
import { createTeam, getTeamsByOrg } from '@/lib/services/team-service';

export const dynamic = 'force-dynamic';

// Only Super Admins and Admins can create and view teams configuration
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;

export async function GET(req: Request) {
  try {
    const auth = await requireRole(req, [...ADMIN_ROLES, 'MANAGER']);
    if (!auth.ok) return auth.response;
    const { session } = auth;

    const teams = await getTeamsByOrg(session.organizationId);

    return NextResponse.json({
      success: true,
      teams,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireRole(req, [...ADMIN_ROLES]);
    if (!auth.ok) return auth.response;
    const { session } = auth;

    const body = await req.json();
    const { name, description, managerId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Team name is required' },
        { status: 400 }
      );
    }

    const team = await createTeam({
      organizationId: session.organizationId,
      name: name.trim(),
      description: description?.trim(),
      managerId: managerId || undefined,
    });

    return NextResponse.json({
      success: true,
      team,
      message: `Team "${team.name}" created successfully.`,
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A team with this name already exists in your organization.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create team' },
      { status: 500 }
    );
  }
}

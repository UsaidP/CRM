'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Users,
  Check,
  X,
  Sparkles,
  Lock,
  Unlock,
  KeyRound,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Sliders,
  FileSpreadsheet,
  Building2,
  DollarSign,
  Car,
  PieChart,
  HelpCircle,
  Copy,
  UserX,
  UserCheck,
  Link as LinkIcon,
  Trash2,
  Plus,
  Edit3,
  UserMinus,
  Briefcase,
  Phone,
  Mail,
  FolderPlus,
} from 'lucide-react';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { CustomSelect, type CustomSelectOption } from '@/components/ui/CustomSelect';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  getUserEffectivePermissions,
  hasPermission,
  type PermissionDefinition,
} from '@/lib/domain/rbac-engine';
import { CrmRole, PermissionKey } from '@/types/crm';

const ROLE_OPTIONS: CustomSelectOption[] = [
  {
    value: 'SUPER_ADMIN',
    label: '👑 SUPER_ADMIN (Owner / Principal)',
    shortLabel: 'Super Admin',
    description: 'Unrestricted full firm access across all modules',
  },
  {
    value: 'ADMIN',
    label: '🛡️ ADMIN (Operations & Systems)',
    shortLabel: 'Admin',
    description: 'Operations management, user provisioning, all teams & reports',
  },
  {
    value: 'MANAGER',
    label: '👔 MANAGER (Team Leader)',
    shortLabel: 'Manager',
    description: 'Floor management, audit approvals, team deal tracking',
  },
  {
    value: 'AGENT',
    label: '💼 AGENT (Senior Sales Advisor)',
    shortLabel: 'Agent',
    description: 'Field visits, matchmaker, personal pipeline deals',
  },
  {
    value: 'TELECALLER',
    label: '🎧 TELECALLER (Calling Desk)',
    shortLabel: 'Telecaller',
    description: 'Speed-to-lead queue, dispositioning, basic bookings',
  },
];

export function RbacManagementClient() {
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'TEAMS'>('MEMBERS');
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  // Active User being edited
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<CrmRole>('TELECALLER');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [customPermissions, setCustomPermissions] = useState<PermissionKey[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // New User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<CrmRole>('AGENT');
  const [newTeamId, setNewTeamId] = useState<string>('');

  // Custom Team Modal State (Create / Edit)
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any | null>(null);
  const [teamFormName, setTeamFormName] = useState('');
  const [teamFormDescription, setTeamFormDescription] = useState('');
  const [teamFormManagerId, setTeamFormManagerId] = useState<string>('');
  const [teamFormMemberIds, setTeamFormMemberIds] = useState<string[]>([]);
  const [teamFormIsActive, setTeamFormIsActive] = useState(true);
  const [mutatingTeamId, setMutatingTeamId] = useState<string | null>(null);

  // Created Invite Link State
  const [createdInviteInfo, setCreatedInviteInfo] = useState<{
    fullName: string;
    email: string;
    inviteUrl: string;
  } | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [mutatingAccessUserId, setMutatingAccessUserId] = useState<string | null>(null);
  const [mutatingDeleteUserId, setMutatingDeleteUserId] = useState<string | null>(null);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/v1/teams');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.teams)) {
          setTeams(data.teams);
          if (data.teams.length > 0 && !newTeamId) {
            setNewTeamId(data.teams[0].id);
          }
        }
      }
    } catch {
      // Non-blocking team fetch
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/v1/users');
      if (res.status === 401 || res.status === 403) {
        setIsUnauthorized(true);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      } else {
        setErrorMsg(data.error || 'Failed to load team members.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error fetching team users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTeams();
    fetch('/api/v1/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.id) setCurrentUserId(data.user.id);
      })
      .catch(() => {});
  }, []);

  const handleToggleActive = async (user: any) => {
    const nextIsActive = !user.isActive;
    const verb = nextIsActive ? 'restore' : 'deactivate';
    if (
      !window.confirm(
        !nextIsActive
          ? `Deactivate ${user.fullName}'s access? Their account will be deactivated and their leads/deals history preserved. You can restore them later.`
          : `Restore ${user.fullName}'s access?`
      )
    ) {
      return;
    }
    try {
      setMutatingAccessUserId(user.id);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextIsActive }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || `${user.fullName} ${verb}d successfully.`);
        await fetchUsers();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || `Failed to ${verb} ${user.fullName}.`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || `Network error while trying to ${verb} ${user.fullName}.`);
    } finally {
      setMutatingAccessUserId(null);
    }
  };

  const handleDeleteMember = async (user: any) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete member "${user.fullName}" (${user.email})? This action will remove their account and cannot be undone.`
      )
    ) {
      return;
    }
    try {
      setMutatingDeleteUserId(user.id);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || `Member ${user.fullName} deleted successfully.`);
        await fetchUsers();
        await fetchTeams();
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setErrorMsg(data.error || `Failed to delete member ${user.fullName}.`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || `Network error while trying to delete member ${user.fullName}.`);
    } finally {
      setMutatingDeleteUserId(null);
    }
  };

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setSelectedRole(user.role as CrmRole);
    setSelectedTeamId(user.teamId || '');
    if (user.customPermissionsJson) {
      try {
        setCustomPermissions(JSON.parse(user.customPermissionsJson));
      } catch {
        setCustomPermissions([]);
      }
    } else {
      setCustomPermissions([]);
    }
  };

  const handleTogglePermission = (permKey: PermissionKey) => {
    if (selectedRole === 'SUPER_ADMIN') return;
    const isCurrentlyActive = customPermissions.includes(permKey);
    if (isCurrentlyActive) {
      setCustomPermissions(customPermissions.filter((p) => p !== permKey));
    } else {
      setCustomPermissions([...customPermissions, permKey]);
    }
  };

  const handleGrantLeadEditing = () => {
    const leadPerms: PermissionKey[] = [
      'leads:view_all',
      'leads:create',
      'leads:edit_all',
      'leads:reassign',
      'leads:bulk_import',
    ];
    const newPerms = Array.from(new Set([...customPermissions, ...leadPerms]));
    setCustomPermissions(newPerms);
  };

  const handleGrantAll = () => {
    setCustomPermissions(ALL_PERMISSIONS.map((p) => p.key));
  };

  const handleResetToDefaults = () => {
    setCustomPermissions([]);
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;
    try {
      setIsSaving(true);
      setErrorMsg(null);
      const res = await fetch(`/api/v1/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          teamId: selectedTeamId || null,
          customPermissions,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Permissions updated for ${editingUser.fullName}!`);
        setEditingUser(null);
        fetchUsers();
        fetchTeams();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || 'Failed to update permissions.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error updating permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newEmail.trim() || !newPhone.trim()) {
      setErrorMsg('Please enter full name, email, and phone number.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newFullName,
          email: newEmail,
          phoneE164: newPhone,
          role: newRole,
          teamId: newTeamId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`New team member ${newFullName} added!`);
        setShowAddUserModal(false);
        if (data.inviteUrl) {
          setCreatedInviteInfo({
            fullName: newFullName,
            email: newEmail,
            inviteUrl: data.inviteUrl,
          });
        }
        setNewFullName('');
        setNewEmail('');
        setNewPhone('');
        setNewRole('AGENT');
        fetchUsers();
        fetchTeams();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || 'Failed to create user.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error creating user.');
    } finally {
      setIsSaving(false);
    }
  };

  // Team Management Handlers
  const handleOpenCreateTeam = () => {
    setEditingTeam(null);
    setTeamFormName('');
    setTeamFormDescription('');
    setTeamFormManagerId('');
    setTeamFormMemberIds([]);
    setTeamFormIsActive(true);
    setShowTeamModal(true);
  };

  const handleOpenEditTeam = (team: any) => {
    setEditingTeam(team);
    setTeamFormName(team.name);
    setTeamFormDescription(team.description || '');
    setTeamFormManagerId(team.managerId || '');
    setTeamFormMemberIds(team.members ? team.members.map((m: any) => m.id) : []);
    setTeamFormIsActive(team.isActive ?? true);
    setShowTeamModal(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamFormName.trim()) {
      setErrorMsg('Team name is required.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const endpoint = editingTeam ? `/api/v1/teams/${editingTeam.id}` : '/api/v1/teams';
      const method = editingTeam ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamFormName.trim(),
          description: teamFormDescription.trim() || undefined,
          managerId: teamFormManagerId || null,
          isActive: teamFormIsActive,
          memberIds: teamFormMemberIds,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(
          editingTeam
            ? `Team "${teamFormName}" updated successfully.`
            : `Custom team "${teamFormName}" created successfully.`
        );
        setShowTeamModal(false);
        setEditingTeam(null);
        await fetchTeams();
        await fetchUsers();
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setErrorMsg(data.error || 'Failed to save team.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error while saving team.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTeam = async (team: any) => {
    if (
      !window.confirm(
        `Are you sure you want to delete custom team "${team.name}"? Members assigned to this team will be unassigned and retain their personal data.`
      )
    ) {
      return;
    }

    try {
      setMutatingTeamId(team.id);
      setErrorMsg(null);
      const res = await fetch(`/api/v1/teams/${team.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || `Team "${team.name}" deleted successfully.`);
        await fetchTeams();
        await fetchUsers();
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setErrorMsg(data.error || `Failed to delete team "${team.name}".`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || `Network error deleting team "${team.name}".`);
    } finally {
      setMutatingTeamId(null);
    }
  };

  const handleGenerateInviteLink = async (user: any) => {
    try {
      setErrorMsg(null);
      const res = await fetch(`/api/v1/users/${user.id}/invite`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.inviteUrl) {
        setCreatedInviteInfo({
          fullName: user.fullName,
          email: user.email,
          inviteUrl: data.inviteUrl,
        });
      } else {
        setErrorMsg(data.error || 'Failed to generate invitation link');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error');
    }
  };

  // Filter users by search and role
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phoneE164.includes(searchQuery) ||
      (u.team?.name && u.team.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    return matchSearch && matchRole;
  });

  // Filter teams by search
  const filteredTeams = teams.filter((t) => {
    return (
      t.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(teamSearchQuery.toLowerCase())) ||
      (t.manager?.fullName && t.manager.fullName.toLowerCase().includes(teamSearchQuery.toLowerCase()))
    );
  });

  // Eligible Managers (Users with MANAGER, ADMIN, SUPER_ADMIN)
  const eligibleManagers = users.filter(
    (u) => u.isActive && (u.role === 'MANAGER' || u.role === 'ADMIN' || u.role === 'SUPER_ADMIN')
  );

  // Group permissions by category for the modal
  const categories = Array.from(new Set(ALL_PERMISSIONS.map((p) => p.category)));

  if (isUnauthorized) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 rounded-2xl bg-surface border border-border shadow-xs my-12">
        <div className="w-12 h-12 rounded-2xl bg-status-danger-surface text-status-danger flex items-center justify-center mx-auto shadow-2xs">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-content">Access Restricted</h2>
          <p className="text-xs text-content-secondary max-w-md mx-auto">
            You do not have permission to view or manage team RBAC permissions. Contact your Super Admin for access.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-xs">
      {/* Top Header */}
      <div className="p-6 rounded-2xl bg-surface border border-border shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-accent" /> ROLE + SCOPE + TEAMS GOVERNANCE
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-status-success-surface text-status-success border border-status-success/30">
                ADMIN AUTHORIZED
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-content font-display tracking-tight">
              Team RBAC, Scope &amp; User Authority
            </h1>
            <p className="text-xs text-content-secondary mt-1 max-w-3xl font-medium">
              Manage operational roles, create custom brokerage teams &amp; squads, and assign data visibility scopes (Own, Team, Organization, Global).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={() => {
                fetchUsers();
                fetchTeams();
              }}
              className="p-2.5 rounded-xl bg-surface border border-border hover:bg-surface-subtle text-content transition-all shadow-2xs cursor-pointer"
              title="Refresh Team Roster"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : ''}`} />
            </button>

            <button
              onClick={handleOpenCreateTeam}
              className="px-4 py-2.5 rounded-xl bg-surface-subtle hover:bg-surface border border-border hover:border-accent/40 text-content font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-accent" /> Create Custom Team
            </button>

            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Add Team Member
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
          <button
            onClick={() => setActiveTab('MEMBERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'MEMBERS'
                ? 'bg-accent text-white shadow-xs'
                : 'bg-surface-subtle hover:bg-surface border border-border text-content-secondary hover:text-content'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Members &amp; Roles</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'MEMBERS'
                  ? 'bg-white/20 text-white'
                  : 'bg-surface border border-border text-content-muted'
              }`}
            >
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('TEAMS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'TEAMS'
                ? 'bg-accent text-white shadow-xs'
                : 'bg-surface-subtle hover:bg-surface border border-border text-content-secondary hover:text-content'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Custom Teams &amp; Squads</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'TEAMS'
                  ? 'bg-white/20 text-white'
                  : 'bg-surface border border-border text-content-muted'
              }`}
            >
              {teams.length}
            </span>
          </button>
        </div>

        {/* Quick Notification Banners */}
        {successMsg && (
          <FeedbackAlert
            variant="success"
            title="Team Update"
            description={successMsg}
            onDismiss={() => setSuccessMsg(null)}
          />
        )}

        {errorMsg && (
          <FeedbackAlert
            variant="error"
            error={errorMsg}
            onDismiss={() => setErrorMsg(null)}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TEAM MEMBERS & ROLES */}
      {/* ========================================================================= */}
      {activeTab === 'MEMBERS' && (
        <div className="space-y-6">
          {/* Filter & Search Bar */}
          <div className="p-4 rounded-2xl bg-surface border border-border shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="w-full md:w-96 relative flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, email, phone, team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input w-full pr-4 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-medium text-content placeholder:text-content-muted focus:outline-none focus:border-accent shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-[11px] font-bold text-content-muted">Filter Role:</span>
              <CustomSelect
                options={[
                  { value: 'ALL', label: 'All Team Roles' },
                  { value: 'SUPER_ADMIN', label: '👑 Super Admin' },
                  { value: 'ADMIN', label: '🛡️ Admin' },
                  { value: 'MANAGER', label: '👔 Manager' },
                  { value: 'AGENT', label: '💼 Agent' },
                  { value: 'TELECALLER', label: '🎧 Telecaller' },
                ]}
                value={selectedRoleFilter}
                onChange={(val) => setSelectedRoleFilter(val)}
                className="w-48"
              />
            </div>
          </div>

          {/* Team Roster Cards Matrix */}
          {filteredUsers.length === 0 ? (
            <EmptyState
              type="filter"
              title="No Team Members Found"
              description="No users match your active search query or role filter. Try resetting filters."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearchQuery('');
                setSelectedRoleFilter('ALL');
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => {
                let customOverridesCount = 0;
                if (user.customPermissionsJson) {
                  try {
                    customOverridesCount = JSON.parse(user.customPermissionsJson).length;
                  } catch {
                    customOverridesCount = 0;
                  }
                }

                const roleColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
                  SUPER_ADMIN: {
                    bg: 'bg-purple-50 dark:bg-purple-950/40',
                    text: 'text-purple-600 dark:text-purple-400',
                    border: 'border-purple-200 dark:border-purple-800',
                    label: 'Super Admin',
                  },
                  ADMIN: {
                    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
                    text: 'text-indigo-600 dark:text-indigo-400',
                    border: 'border-indigo-200 dark:border-indigo-800',
                    label: 'Admin',
                  },
                  MANAGER: {
                    bg: 'bg-blue-50 dark:bg-blue-950/40',
                    text: 'text-blue-600 dark:text-blue-400',
                    border: 'border-blue-200 dark:border-blue-800',
                    label: 'Manager',
                  },
                  AGENT: {
                    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
                    text: 'text-emerald-600 dark:text-emerald-400',
                    border: 'border-emerald-200 dark:border-emerald-800',
                    label: 'Agent',
                  },
                  TELECALLER: {
                    bg: 'bg-amber-50 dark:bg-amber-950/40',
                    text: 'text-amber-600 dark:text-amber-400',
                    border: 'border-amber-200 dark:border-amber-800',
                    label: 'Telecaller',
                  },
                };

                const style = roleColors[user.role] || roleColors.TELECALLER;

                return (
                  <div
                    key={user.id}
                    className={`p-5 rounded-2xl bg-surface border border-border hover:border-accent/40 shadow-2xs hover:shadow-xs transition-all space-y-4 flex flex-col justify-between ${
                      !user.isActive ? 'opacity-60 grayscale' : ''
                    }`}
                  >
                    <div className="space-y-3">
                      {/* User Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-surface-subtle border border-border flex items-center justify-center font-bold text-xs text-content shrink-0 shadow-2xs">
                            {user.fullName
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-content truncate font-display">
                                {user.fullName}
                              </span>
                              {!user.isActive && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-status-danger-surface text-status-danger border border-status-danger/30">
                                  DEACTIVATED
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-content-muted font-mono truncate">{user.email}</div>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold shrink-0 border ${style.bg} ${style.text} ${style.border}`}
                        >
                          {style.label}
                        </span>
                      </div>

                      {/* Team Assignment & Phone */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-[11px]">
                        <div>
                          <span className="text-[10px] text-content-muted block font-medium">Custom Team Desk</span>
                          <span className="font-bold text-content truncate block">
                            {user.team?.name ? `🏢 ${user.team.name}` : '— (No Team)'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-content-muted block font-medium">Contact Phone</span>
                          <span className="font-mono text-content truncate block">{user.phoneE164 || '—'}</span>
                        </div>
                      </div>

                      {/* Scope & Override Pills */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-surface-subtle border border-border text-content-muted">
                          Scope:{' '}
                          {user.role === 'SUPER_ADMIN'
                            ? 'GLOBAL'
                            : user.role === 'ADMIN'
                            ? 'ORG'
                            : user.role === 'MANAGER'
                            ? 'TEAM'
                            : user.role === 'AGENT'
                            ? 'OWN+ASSIGNED'
                            : 'OWN'}
                        </span>
                        {customOverridesCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> +{customOverridesCount} overrides
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {user.inviteToken && (
                          <button
                            type="button"
                            onClick={() => handleGenerateInviteLink(user)}
                            className="px-2.5 py-1.5 rounded-xl bg-surface-subtle hover:bg-surface border border-border text-[11px] font-bold text-content flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                            title="View set-password link"
                          >
                            <LinkIcon className="w-3 h-3 text-accent" /> Link
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(user)}
                          disabled={mutatingAccessUserId === user.id || mutatingDeleteUserId === user.id}
                          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
                            user.isActive
                              ? 'bg-status-warning-surface/40 hover:bg-status-warning-surface border-status-warning/30 text-status-warning'
                              : 'bg-status-success-surface/40 hover:bg-status-success-surface border-status-success/30 text-status-success'
                          }`}
                          title={user.isActive ? 'Deactivate member access' : 'Restore member access'}
                        >
                          {user.isActive ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          <span>{user.isActive ? 'Deactivate' : 'Restore'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(user)}
                          disabled={mutatingDeleteUserId === user.id || mutatingAccessUserId === user.id}
                          className="px-2.5 py-1.5 rounded-xl border border-status-danger/30 bg-status-danger-surface/40 hover:bg-status-danger-surface text-status-danger text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50"
                          title={`Delete member ${user.fullName}`}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{mutatingDeleteUserId === user.id ? 'Deleting...' : 'Delete'}</span>
                        </button>
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEdit(user)}
                        leftIcon={<Sliders className="w-3.5 h-3.5" />}
                      >
                        Edit Permissions
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CUSTOM TEAMS & SQUADS */}
      {/* ========================================================================= */}
      {activeTab === 'TEAMS' && (
        <div className="space-y-6">
          {/* Teams Search & Summary Bar */}
          <div className="p-4 rounded-2xl bg-surface border border-border shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="w-full md:w-96 relative flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search custom teams by name, manager, description..."
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                className="search-input w-full pr-4 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-medium text-content placeholder:text-content-muted focus:outline-none focus:border-accent shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <span className="text-[11px] font-medium text-content-muted">
                Showing {filteredTeams.length} of {teams.length} custom squads
              </span>
              <button
                onClick={handleOpenCreateTeam}
                className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> New Team
              </button>
            </div>
          </div>

          {/* Custom Teams Grid */}
          {filteredTeams.length === 0 ? (
            <EmptyState
              type="general"
              title="No Custom Teams Created Yet"
              description="Create regional squads, commercial/residential desks, or luxury divisions to manage lead routing and team visibility."
              actionLabel="Create Custom Team"
              onAction={handleOpenCreateTeam}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTeams.map((team) => {
                const memberCount = team.members?.length || 0;

                return (
                  <div
                    key={team.id}
                    className={`p-5 rounded-2xl bg-surface border border-border hover:border-accent/40 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4 ${
                      !team.isActive ? 'opacity-65' : ''
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-accent-soft border border-accent/20 flex items-center justify-center font-bold text-accent shrink-0 shadow-2xs">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-sm text-content font-display truncate">
                                {team.name}
                              </h3>
                              {!team.isActive && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-status-danger-surface text-status-danger border border-status-danger/30">
                                  INACTIVE
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-content-muted line-clamp-2 mt-0.5">
                              {team.description || 'No description provided.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditTeam(team)}
                            className="p-1.5 rounded-lg text-content-muted hover:text-content hover:bg-surface-subtle border border-transparent hover:border-border transition-all cursor-pointer"
                            title="Edit Custom Team"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTeam(team)}
                            disabled={mutatingTeamId === team.id}
                            className="p-1.5 rounded-lg text-status-danger/80 hover:text-status-danger hover:bg-status-danger-surface/40 border border-transparent hover:border-status-danger/30 transition-all cursor-pointer disabled:opacity-50"
                            title="Delete Team"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Designated Manager Box */}
                      <div className="p-3 rounded-xl bg-surface-subtle border border-border/80 space-y-1.5">
                        <span className="text-[10px] font-bold text-content-muted uppercase tracking-wider block">
                          Designated Team Manager
                        </span>
                        {team.manager ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-content block truncate font-display">
                                👔 {team.manager.fullName}
                              </span>
                              <span className="font-mono text-[10px] text-content-muted truncate block">
                                {team.manager.email} {team.manager.phoneE164 ? `• ${team.manager.phoneE164}` : ''}
                              </span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shrink-0">
                              {team.manager.role}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-content-muted italic flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            <span>No manager assigned. Managed by Organization Admin.</span>
                          </div>
                        )}
                      </div>

                      {/* Team Members Roster */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-content flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-accent" />
                            <span>Roster Members ({memberCount})</span>
                          </span>
                          <span className="text-[10px] text-content-muted font-mono">
                            TEAM-scoped access
                          </span>
                        </div>

                        {memberCount === 0 ? (
                          <div className="p-3 rounded-xl border border-dashed border-border text-center text-[11px] text-content-muted">
                            No brokers or telecallers assigned to this squad yet.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                            {team.members.map((member: any) => (
                              <div
                                key={member.id}
                                className="px-2.5 py-1 rounded-xl bg-surface border border-border flex items-center gap-1.5 text-[10px] font-medium text-content shadow-2xs"
                              >
                                <span className="font-bold">{member.fullName}</span>
                                <span className="text-content-muted font-mono">({member.role})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                      <span className="text-[10px] text-content-muted font-mono">
                        ID: {team.id.slice(0, 8)}...
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEditTeam(team)}
                        leftIcon={<Sliders className="w-3 h-3" />}
                      >
                        Manage Team
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE / EDIT CUSTOM TEAM MODAL */}
      {/* ========================================================================= */}
      <AccessibleDialog
        open={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        titleId="team-modal-title"
        descriptionId="team-modal-description"
        size="lg"
        panelClassName="!p-0 overflow-hidden"
      >
        <div className="flex flex-col text-content font-sans">
          <div className="p-6 border-b border-border bg-surface-subtle flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-accent-soft border border-accent/25 rounded-2xl text-accent shadow-2xs">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 id="team-modal-title" className="text-lg font-black text-content font-display">
                    {editingTeam ? `Edit Squad: ${editingTeam.name}` : 'Create Custom Team / Squad'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20">
                    ADMIN &amp; SUPER ADMIN
                  </span>
                </div>
                <p id="team-modal-description" className="text-xs text-content-secondary mt-1">
                  Define specialized sales units (e.g. Luxury High-Rise, BKC Commercial, NRI Desk), assign managers, and group brokers for lead sharing.
                </p>
              </div>
            </div>
            <button
              type="button"
              data-dialog-close
              onClick={() => setShowTeamModal(false)}
              className="p-2 rounded-xl text-content-muted hover:text-content hover:bg-surface border border-transparent hover:border-border transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveTeam} className="p-6 md:p-8 space-y-6 text-xs">
            {errorMsg && (
              <FeedbackAlert
                variant="error"
                error={errorMsg}
                onDismiss={() => setErrorMsg(null)}
              />
            )}

            {/* Team Profile Fields */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-content uppercase tracking-wider font-display">
                <span className="w-2 h-2 rounded-full bg-accent" />
                1. Team Definition
              </div>

              <FormInput
                label="Team / Squad Name"
                required
                placeholder="e.g. BKC Commercial Division, South Mumbai Luxury"
                value={teamFormName}
                onChange={(e) => setTeamFormName(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-content block">
                  Description / Mandate
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Focuses on premium Grade-A commercial leasing and pre-leased assets."
                  value={teamFormDescription}
                  onChange={(e) => setTeamFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content placeholder:text-content-muted focus:outline-none focus:border-accent"
                />
              </div>

              {/* Designated Manager */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-content flex items-center justify-between">
                  <span>Designated Team Manager</span>
                  <span className="text-[11px] font-normal text-content-muted">
                    Must have Manager or Admin role
                  </span>
                </label>
                <CustomSelect
                  options={[
                    { value: '', label: 'None (Direct Organization Management)' },
                    ...eligibleManagers.map((m) => ({
                      value: m.id,
                      label: `👔 ${m.fullName} (${m.role})`,
                      description: m.email,
                    })),
                  ]}
                  value={teamFormManagerId}
                  onChange={(val) => setTeamFormManagerId(val)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Team Members Assignment Checklist */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-content uppercase tracking-wider font-display">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  2. Assign Team Members ({teamFormMemberIds.length} Selected)
                </div>
                <span className="text-[11px] text-content-muted">
                  Users can belong to one team desk
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-subtle border border-border max-h-52 overflow-y-auto space-y-2">
                {users
                  .filter((u) => u.isActive)
                  .map((u) => {
                    const isSelected = teamFormMemberIds.includes(u.id);
                    const currentTeamName = u.team?.name;
                    const isAssignedElsewhere =
                      currentTeamName && (!editingTeam || u.teamId !== editingTeam.id);

                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          if (isSelected) {
                            setTeamFormMemberIds(teamFormMemberIds.filter((id) => id !== u.id));
                          } else {
                            setTeamFormMemberIds([...teamFormMemberIds, u.id]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-accent-soft/30 border-accent text-content shadow-2xs'
                            : 'bg-surface border-border hover:border-border-strong text-content'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-accent border-accent text-white'
                                : 'border-border bg-surface'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs block truncate font-display">
                              {u.fullName}
                            </span>
                            <span className="text-[10px] text-content-muted font-mono truncate block">
                              {u.email} • {u.role}
                            </span>
                          </div>
                        </div>

                        {isAssignedElsewhere && (
                          <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                            Currently in {currentTeamName}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-5 border-t border-border flex items-center justify-between gap-4">
              <div className="text-[11px] text-content-muted flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span>Team assignments apply immediately.</span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setShowTeamModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSaving}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  {editingTeam ? 'Save Team Changes' : 'Create Custom Team'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </AccessibleDialog>

      {/* ========================================================================= */}
      {/* EDIT USER PERMISSIONS MODAL */}
      {/* ========================================================================= */}
      <AccessibleDialog
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        titleId="edit-user-permissions-title"
        descriptionId="edit-user-permissions-description"
        size="xl"
        panelClassName="!p-0 overflow-hidden"
      >
        {editingUser && (
          <div className="flex flex-col text-content font-sans max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-border bg-surface-subtle flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-accent-soft border border-accent/25 rounded-2xl text-accent shadow-2xs">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 id="edit-user-permissions-title" className="text-lg font-black text-content font-display">
                      Configure RBAC for {editingUser.fullName}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20">
                      {editingUser.role}
                    </span>
                  </div>
                  <p id="edit-user-permissions-description" className="text-xs text-content-secondary mt-1">
                    Assign primary role, team desk, and grant granular capability overrides.
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-dialog-close
                onClick={() => setEditingUser(null)}
                className="p-2 rounded-xl text-content-muted hover:text-content hover:bg-surface border border-transparent hover:border-border transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role & Team Switcher Toolbar */}
            <div className="p-5 border-b border-border bg-surface flex flex-col gap-4">
              {editingUser?.id === currentUserId && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-[12px] text-amber-500">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Self-Lockout Safeguard Active</span>
                    <span className="text-content-muted text-[11px] block mt-0.5">
                      You are editing your own user profile. Modifying your own administrative role is locked to prevent accidental lockout from the admin panel.
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="text-[11px] font-bold text-content-muted block mb-1">
                    Primary Base Role:
                  </label>
                  <CustomSelect
                    options={ROLE_OPTIONS}
                    value={selectedRole}
                    onChange={(val) => setSelectedRole(val as CrmRole)}
                    disabled={editingUser?.id === currentUserId}
                    className="w-full"
                  />
                  {editingUser?.id === currentUserId && (
                    <span className="text-[10px] text-content-muted block mt-1">
                      🔒 Locked: Base role modifications must be performed by another administrator.
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-content-muted">
                      Team Desk Assignment:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUser(null);
                        handleOpenCreateTeam();
                      }}
                      className="text-[10px] text-accent font-bold hover:underline cursor-pointer"
                    >
                      + New Custom Team
                    </button>
                  </div>
                  <CustomSelect
                    options={[
                      { value: '', label: 'No Team Desk (Floating / Admin)' },
                      ...teams.map((t) => ({ value: t.id, label: `🏢 ${t.name}` })),
                    ]}
                    value={selectedTeamId}
                    onChange={(val) => setSelectedTeamId(val)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Quick Presets Toolbar */}
            <div className="px-5 py-3 border-b border-border bg-surface-subtle flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-content-muted">Quick Overrides:</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleGrantLeadEditing}
                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-accent" />}
                  className="!border-emerald-200 dark:!border-emerald-800 !bg-emerald-50 dark:!bg-emerald-950/40 !text-emerald-600 dark:!text-emerald-400"
                  title="Grants full editing rights for leads"
                >
                  + Full Lead Editing
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleGrantAll}
                  leftIcon={<Unlock className="w-3.5 h-3.5" />}
                >
                  Grant All
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleResetToDefaults}
                >
                  Reset Defaults
                </Button>
              </div>
            </div>

            {/* Granular Permission Toggles Matrix */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-280px)] space-y-6">
              {categories.map((cat) => {
                const perms = ALL_PERMISSIONS.filter((p) => p.category === cat);

                return (
                  <div key={cat} className="space-y-3">
                    <h3 className="text-xs font-extrabold text-content uppercase tracking-wider flex items-center gap-2 font-display">
                      <span className="w-2 h-2 rounded-full bg-accent" />
                      {cat}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms.map((perm) => {
                        const isRoleDefault = DEFAULT_ROLE_PERMISSIONS[selectedRole]?.includes(perm.key);
                        const isCustomGranted = customPermissions.includes(perm.key);
                        const isEffectivelyActive =
                          selectedRole === 'SUPER_ADMIN' || isRoleDefault || isCustomGranted;

                        return (
                          <div
                            key={perm.key}
                            onClick={() =>
                              selectedRole !== 'SUPER_ADMIN' && handleTogglePermission(perm.key)
                            }
                            className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                              selectedRole === 'SUPER_ADMIN'
                                ? 'bg-surface-subtle/60 border-border opacity-80 cursor-default'
                                : isEffectivelyActive
                                ? 'bg-accent-soft/20 border-accent/40 shadow-2xs cursor-pointer hover:border-accent'
                                : 'bg-surface border-border hover:border-border-strong cursor-pointer'
                            }`}
                          >
                            <div className="space-y-1 min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-content font-display">
                                  {perm.label}
                                </span>
                                {isRoleDefault && selectedRole !== 'SUPER_ADMIN' && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-surface border border-border text-content-muted font-semibold">
                                    Default
                                  </span>
                                )}
                                {isCustomGranted && !isRoleDefault && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">
                                    Override Active
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-content-muted leading-relaxed">
                                {perm.description}
                              </p>
                            </div>

                            <div
                              className={`w-10 h-6 rounded-full transition-colors p-0.5 shrink-0 flex items-center ${
                                isEffectivelyActive
                                  ? 'bg-accent justify-end'
                                  : 'bg-surface-subtle border border-border justify-start'
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                                  isEffectivelyActive ? 'text-accent' : 'text-content-muted'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 md:p-5 border-t border-border bg-surface-subtle flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-content-muted flex items-center gap-2 font-medium">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span>Changes apply immediately across all client sessions and API queries.</span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  isLoading={isSaving}
                  onClick={handleSavePermissions}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Save Permission Matrix
                </Button>
              </div>
            </div>
          </div>
        )}
      </AccessibleDialog>

      {/* ========================================================================= */}
      {/* ADD NEW TEAM MEMBER MODAL */}
      {/* ========================================================================= */}
      <AccessibleDialog
        open={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        titleId="add-user-title"
        descriptionId="add-user-description"
        size="lg"
        panelClassName="!p-0 overflow-hidden"
      >
        <div className="flex flex-col text-content font-sans">
          <div className="p-6 border-b border-border bg-surface-subtle flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-accent-soft border border-accent/25 rounded-2xl text-accent shadow-2xs">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 id="add-user-title" className="text-lg font-black text-content font-display">
                    Add Team Member
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20">
                    ADMIN PROVISIONING
                  </span>
                </div>
                <p id="add-user-description" className="text-xs text-content-secondary mt-1">
                  Provision new team members, assign to custom teams/squads, and set initial operational roles.
                </p>
              </div>
            </div>
            <button
              type="button"
              data-dialog-close
              onClick={() => setShowAddUserModal(false)}
              className="p-2 rounded-xl text-content-muted hover:text-content hover:bg-surface border border-transparent hover:border-border transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="p-6 md:p-8 space-y-6 text-xs">
            {errorMsg && (
              <FeedbackAlert
                variant="error"
                error={errorMsg}
                onDismiss={() => setErrorMsg(null)}
              />
            )}

            {/* 1. Identity Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-content uppercase tracking-wider font-display">
                <span className="w-2 h-2 rounded-full bg-accent" />
                1. Profile &amp; Contact Details
              </div>

              <FormInput
                label="Full Legal Name"
                required
                placeholder="e.g. Usaid Patel"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Email Address"
                  type="email"
                  required
                  placeholder="e.g. usaid@zamzamproperties.in"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />

                <FormInput
                  label="Mobile Number (E.164)"
                  type="tel"
                  required
                  placeholder="e.g. +91 9820123456"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>

              {/* Team Desk Assignment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-content flex items-center gap-2">
                    <span>Assigned Custom Team Desk</span>
                    <span className="text-[11px] font-normal text-content-muted">
                      Required for Agents &amp; Telecallers
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUserModal(false);
                      handleOpenCreateTeam();
                    }}
                    className="text-[10px] text-accent font-bold hover:underline cursor-pointer"
                  >
                    + Create Custom Team
                  </button>
                </div>
                <CustomSelect
                  options={[
                    { value: '', label: 'Select a Team Desk...' },
                    ...teams.map((t) => ({ value: t.id, label: `🏢 ${t.name}` })),
                  ]}
                  value={newTeamId}
                  onChange={(val) => setNewTeamId(val)}
                  className="w-full"
                />
              </div>
            </div>

            {/* 2. Primary Role Selection Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-content uppercase tracking-wider font-display">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  2. Operational Governance Role <span className="text-status-danger">*</span>
                </div>
                <span className="text-[11px] text-content-muted">
                  Scope determines record visibility
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'TELECALLER',
                    name: '🎧 Telecaller Desk',
                    desc: 'Speed-to-lead queue, calling dispositions. Scope: OWN records only.',
                  },
                  {
                    id: 'AGENT',
                    name: '💼 Sales Agent',
                    desc: 'Site visits, buyer matchmaker, personal deals. Scope: OWN + ASSIGNED.',
                  },
                  {
                    id: 'MANAGER',
                    name: '👔 Team Manager',
                    desc: 'Team lead, deal approvals, reassignments. Scope: TEAM records.',
                  },
                  {
                    id: 'ADMIN',
                    name: '🛡️ Operations Admin',
                    desc: 'Manage all teams, users, and audit settings. Scope: ORGANIZATION-WIDE.',
                  },
                  {
                    id: 'SUPER_ADMIN',
                    name: '👑 Super Admin',
                    desc: 'System owner, unrestricted global authority across all firm operations.',
                  },
                ].map((r) => {
                  const isSelected = newRole === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setNewRole(r.id as CrmRole)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                        isSelected
                          ? 'bg-accent-soft/30 border-accent shadow-xs'
                          : 'bg-surface border-border hover:border-border-strong hover:bg-surface-subtle'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-content font-display">{r.name}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'bg-accent border-accent text-white'
                              : 'border-border bg-surface'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-content-muted leading-relaxed">{r.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-5 border-t border-border flex items-center justify-between gap-4">
              <div className="text-[11px] text-content-muted flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span>Configured credentials activate immediately.</span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setShowAddUserModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSaving}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Create Team Member
                </Button>
              </div>
            </div>
          </form>
        </div>
      </AccessibleDialog>

      {/* ========================================================================= */}
      {/* ACTIVATION LINK MODAL */}
      {/* ========================================================================= */}
      <AccessibleDialog
        open={!!createdInviteInfo}
        onClose={() => {
          setCreatedInviteInfo(null);
          setCopiedInvite(false);
        }}
        titleId="activation-link-title"
        descriptionId="activation-link-description"
        size="md"
        panelClassName="!p-0 overflow-hidden"
      >
        {createdInviteInfo && (
          <div className="flex flex-col text-content font-sans">
            <div className="p-6 border-b border-border bg-surface-subtle flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-accent-soft border border-accent/25 rounded-2xl text-accent shadow-2xs">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="activation-link-title" className="text-base font-black text-content font-display">
                      Set-Password &amp; Activation Link
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-status-success-surface text-status-success border border-status-success/30">
                      READY
                    </span>
                  </div>
                  <p id="activation-link-description" className="text-xs text-content-secondary mt-0.5">
                    Share this unique link with <strong>{createdInviteInfo.fullName}</strong> ({createdInviteInfo.email}) so they can set their password.
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-dialog-close
                onClick={() => {
                  setCreatedInviteInfo(null);
                  setCopiedInvite(false);
                }}
                className="p-2 rounded-xl text-content-muted hover:text-content hover:bg-surface border border-transparent hover:border-border transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-surface-subtle border border-border rounded-xl font-mono text-xs text-content break-all select-all">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}${createdInviteInfo.inviteUrl}`
                  : createdInviteInfo.inviteUrl}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <span className="text-[11px] text-content-muted">
                  Link expires in 7 days.
                </span>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => {
                    const fullUrl = `${window.location.origin}${createdInviteInfo.inviteUrl}`;
                    navigator.clipboard.writeText(fullUrl);
                    setCopiedInvite(true);
                    setTimeout(() => setCopiedInvite(false), 2500);
                  }}
                  leftIcon={copiedInvite ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                >
                  {copiedInvite ? 'Copied to Clipboard!' : 'Copy Activation Link'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </AccessibleDialog>
    </div>
  );
}

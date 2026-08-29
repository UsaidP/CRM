'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { CustomSelect, type CustomSelectOption } from '@/components/ui/CustomSelect';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
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
    value: 'BROKER_MANAGER',
    label: '👔 BROKER_MANAGER (Team Leader)',
    shortLabel: 'Broker Manager',
    description: 'Floor management, audit approvals, team deal tracking',
  },
  {
    value: 'SALES_EXECUTIVE',
    label: '💼 SALES_EXECUTIVE (Senior Advisor)',
    shortLabel: 'Sales Executive',
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
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  // Active User being edited
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<CrmRole>('TELECALLER');
  const [customPermissions, setCustomPermissions] = useState<PermissionKey[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // New User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<CrmRole>('TELECALLER');

  // Created Invite Link State
  const [createdInviteInfo, setCreatedInviteInfo] = useState<{
    fullName: string;
    email: string;
    inviteUrl: string;
  } | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [mutatingAccessUserId, setMutatingAccessUserId] = useState<string | null>(null);

  const handleToggleActive = async (user: any) => {
    const removing = !!user.isActive;
    const verb = removing ? 'remove' : 'restore';
    if (
      !window.confirm(
        removing
          ? `Remove ${user.fullName}'s access? Their account will be deactivated and their leads/deals history preserved. You can restore them later.`
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
        method: removing ? 'DELETE' : 'PATCH',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || `${user.fullName} ${verb}d successfully.`);
        await fetchUsers();
      } else {
        setErrorMsg(data.error || `Failed to ${verb} ${user.fullName}.`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || `Network error while trying to ${verb} ${user.fullName}.`);
    } finally {
      setMutatingAccessUserId(null);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setIsUnauthorized(false);
      const res = await fetch('/api/v1/users');
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users || []);
      } else {
        if (res.status === 403 || res.status === 401) {
          setIsUnauthorized(true);
        }
        setErrorMsg(data.error || 'Failed to fetch team users.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error fetching team.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setSelectedRole(user.role as CrmRole);

    let parsedCustom: PermissionKey[] = [];
    if (user.customPermissionsJson) {
      try {
        parsedCustom = JSON.parse(user.customPermissionsJson);
      } catch {
        parsedCustom = [];
      }
    }
    setCustomPermissions(parsedCustom);
  };

  const handleTogglePermission = (key: PermissionKey) => {
    const isRoleDefault = DEFAULT_ROLE_PERMISSIONS[selectedRole]?.includes(key);

    if (customPermissions.includes(key)) {
      setCustomPermissions((prev) => prev.filter((k) => k !== key));
    } else {
      setCustomPermissions((prev) => [...prev, key]);
    }
  };

  const handleGrantAll = () => {
    setCustomPermissions(ALL_PERMISSIONS.map((p) => p.key));
  };

  const handleGrantLeadEditing = () => {
    // Specifically grant all lead management capabilities to user
    const leadKeys: PermissionKey[] = [
      'leads:view_all',
      'leads:create',
      'leads:edit_all',
      'leads:delete',
      'leads:reassign',
      'leads:bulk_import',
      'leads:merge',
    ];
    setCustomPermissions((prev) => Array.from(new Set([...prev, ...leadKeys])));
  };

  const handleResetToDefaults = () => {
    setCustomPermissions([]);
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/users/${editingUser.id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          customPermissions: customPermissions,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Permissions updated for ${editingUser.fullName}!`);
        setEditingUser(null);
        fetchUsers();
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
        setNewRole('TELECALLER');
        fetchUsers();
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
      u.phoneE164.includes(searchQuery);
    const matchRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    return matchSearch && matchRole;
  });

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
            You do not have permission to view or manage team RBAC permissions. Contact your Super Admin or Broker Manager for access.
          </p>
        </div>
        <div className="pt-2">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            Return to Dashboard
          </a>
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
                <KeyRound className="w-3.5 h-3.5 text-accent" /> DYNAMIC ACCESS GOVERNANCE
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-status-success-surface text-status-success border border-status-success/30">
                SUPER ADMIN AUTHORIZED
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-content font-display tracking-tight">
              Team RBAC &amp; Granular Permission Authority
            </h1>
            <p className="text-xs text-content-secondary mt-1 max-w-3xl font-medium">
              Grant or customize granular capabilities for any team member at any time. Elevate telecallers with full lead editing authority, delegate MahaRERA audit certifications, or manage closing ledger access.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchUsers}
              className="p-2.5 rounded-xl bg-surface border border-border hover:bg-surface-subtle text-content transition-all shadow-2xs cursor-pointer"
              title="Refresh Team Roster"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : ''}`} />
            </button>

            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Add Team Member
            </button>
          </div>
        </div>

        {/* Quick Notification Banners */}
        {successMsg && (
          <div className="p-3.5 bg-status-success-surface border border-status-success/30 rounded-xl text-status-success font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-status-success" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-status-danger-surface border border-status-danger/30 rounded-xl text-status-danger font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-status-danger" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="w-full md:w-96 relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
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
              { value: 'BROKER_MANAGER', label: '👔 Broker Manager' },
              { value: 'SALES_EXECUTIVE', label: '💼 Sales Executive' },
              { value: 'TELECALLER', label: '🎧 Telecaller' },
            ]}
            value={selectedRoleFilter}
            onChange={(val) => setSelectedRoleFilter(val)}
            className="w-48"
          />
        </div>
      </div>

      {/* Team Roster Cards Matrix */}
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

          const roleColors: Record<string, { bg: string; text: string; border: string }> = {
            SUPER_ADMIN: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
            BROKER_MANAGER: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
            SALES_EXECUTIVE: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
            TELECALLER: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
          };

          const style = roleColors[user.role] || roleColors.TELECALLER;

          return (
            <div
              key={user.id}
              className={`p-5 rounded-2xl bg-surface border border-border hover:border-accent/40 shadow-2xs hover:shadow-xs transition-all space-y-4 flex flex-col justify-between ${!user.isActive ? 'opacity-60 grayscale' : ''}`}
            >
              <div className="space-y-3">
                {/* User Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-accent-soft text-accent font-bold font-display text-sm flex items-center justify-center border border-accent/20 shadow-2xs">
                      {user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-content font-display">{user.fullName}</h3>
                      <p className="text-[11px] text-content-muted font-mono">{user.phoneE164}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border ${style.bg} ${style.text} ${style.border}`}>
                    {user.role}
                  </span>
                </div>

                {!user.isActive && (
                  <div className="px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-[10px] font-bold font-mono flex items-center gap-1.5">
                    <UserX className="w-3 h-3" /> ACCESS REMOVED
                  </div>
                )}

                <div className="text-[11px] text-content-secondary line-clamp-1">
                  {user.email}
                </div>

                {/* Permissions Status Summary */}
                <div className="p-3 rounded-xl bg-surface-subtle border border-border/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-content-muted font-medium">Effective Access:</span>
                    <span className="font-mono font-bold text-content">
                      {user.role === 'SUPER_ADMIN' ? 'Full Authority (23/23)' : `${user.effectivePermissions?.length || 0} / 23 Capabilities`}
                    </span>
                  </div>

                  {customOverridesCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent">
                      <Sparkles className="w-3 h-3" />
                      <span>+{customOverridesCount} Custom Super Admin Grants</span>
                    </div>
                  )}

                  {/* Highlights specific key overrides like lead editing */}
                  {user.role === 'TELECALLER' && user.effectivePermissions?.includes('leads:edit_all') && (
                    <div className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Can Edit Any Lead Data
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => openEditModal(user)}
                  className="w-full py-2.5 rounded-xl bg-surface hover:bg-surface-subtle border border-border hover:border-accent text-content hover:text-accent font-bold transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-accent" />
                  <span>Configure Access &amp; Overrides</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateInviteLink(user)}
                  className="w-full py-2 rounded-xl bg-surface-subtle hover:bg-accent-soft border border-border hover:border-accent/40 text-content-secondary hover:text-accent-text text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LinkIcon className="w-3 h-3 text-accent" />
                  <span>Generate Set-Password Link</span>
                </button>

                <button
                  type="button"
                  disabled={mutatingAccessUserId === user.id}
                  onClick={() => handleToggleActive(user)}
                  className={`w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
                    user.isActive
                      ? 'bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-200 hover:border-red-400 dark:border-red-800 text-red-600 dark:text-red-400'
                      : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200 hover:border-emerald-400 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {user.isActive ? (
                    <>
                      <UserX className="w-3 h-3" />
                      <span>{mutatingAccessUserId === user.id ? 'Removing…' : 'Remove Access'}</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3 h-3" />
                      <span>{mutatingAccessUserId === user.id ? 'Restoring…' : 'Restore Access'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Permissions Modal */}
      <AccessibleDialog
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        titleId="edit-permissions-title"
        descriptionId="edit-permissions-description"
        size="xl"
        panelClassName="!p-0 overflow-hidden"
      >
        {editingUser && (
          <div className="flex flex-col text-content font-sans">
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-surface-subtle flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-accent-soft border border-accent/20 rounded-2xl text-accent shadow-2xs">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 id="edit-permissions-title" className="text-lg font-extrabold text-content font-display">
                      Custom Access &amp; Role Overrides
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20">
                      SUPER ADMIN CONTROLLER
                    </span>
                  </div>
                  <p id="edit-permissions-description" className="text-xs text-content-secondary mt-0.5">
                    Configuring permissions for <strong>{editingUser.fullName}</strong> ({editingUser.email} • {editingUser.phoneE164})
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

            {/* Role Switcher & 1-Click Quick Presets Toolbar */}
            <div className="p-5 border-b border-border bg-surface flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="w-full md:w-72">
                <label className="text-[11px] font-bold text-content-muted block mb-1">
                  Primary Base Role:
                </label>
                <CustomSelect
                  options={ROLE_OPTIONS}
                  value={selectedRole}
                  onChange={(val) => setSelectedRole(val as CrmRole)}
                  className="w-full"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleGrantLeadEditing}
                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-accent" />}
                  className="!border-emerald-200 dark:!border-emerald-800 !bg-emerald-50 dark:!bg-emerald-950/40 !text-emerald-600 dark:!text-emerald-400"
                  title="Grants full editing rights for all firm leads"
                >
                  + Grant All Lead Editing
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleGrantAll}
                  leftIcon={<Unlock className="w-3.5 h-3.5" />}
                >
                  Grant Full Access
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
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-260px)] space-y-6">
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
                        const isEffectivelyActive = selectedRole === 'SUPER_ADMIN' || isRoleDefault || isCustomGranted;

                        return (
                          <div
                            key={perm.key}
                            onClick={() => selectedRole !== 'SUPER_ADMIN' && handleTogglePermission(perm.key)}
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
                                <span className="font-bold text-xs text-content font-display">{perm.label}</span>
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
                              <p className="text-[11px] text-content-muted leading-relaxed">{perm.description}</p>
                            </div>

                            {/* Toggle Switch */}
                            <div
                              className={`w-10 h-6 rounded-full transition-colors p-0.5 shrink-0 flex items-center ${
                                isEffectivelyActive ? 'bg-accent justify-end' : 'bg-surface-subtle border border-border justify-start'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${isEffectivelyActive ? 'text-accent' : 'text-content-muted'}`} />
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
                <span>Super Admin changes apply immediately across all client and API sessions.</span>
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

      {/* Add New Team Member Modal */}
      <AccessibleDialog
        open={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        titleId="add-user-title"
        descriptionId="add-user-description"
        size="lg"
        panelClassName="!p-0 overflow-hidden"
      >
        <div className="flex flex-col text-content font-sans">
          {/* Modal Header */}
          <div className="p-6 border-b border-border bg-surface-subtle flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-accent-soft border border-accent/25 rounded-2xl text-accent shadow-2xs">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 id="add-user-title" className="text-lg font-black text-content font-display">Add Team Member</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20">
                    SUPER ADMIN DESK
                  </span>
                </div>
                <p id="add-user-description" className="text-xs text-content-secondary mt-1">
                  Provision new broker accounts, define operational queues, and assign primary governance roles.
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
              <div className="p-4 bg-status-danger-surface border border-status-danger/30 rounded-2xl text-status-danger font-bold flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-status-danger shrink-0" />
                <span className="text-xs">{errorMsg}</span>
              </div>
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
                  placeholder="e.g. usaid@zamzamrealty.com"
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
            </div>

            {/* 2. Primary Role Selection Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-content uppercase tracking-wider font-display">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  2. Operational Governance Role <span className="text-status-danger">*</span>
                </div>
                <span className="text-[11px] text-content-muted">Can be elevated with custom overrides anytime</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'TELECALLER',
                    name: '🎧 Telecaller Desk',
                    desc: 'Inbound speed-to-lead queue, calling dispositions, portal sharing.',
                  },
                  {
                    id: 'SALES_EXECUTIVE',
                    name: '💼 Sales Executive',
                    desc: 'Field site visits, buyer matchmaker, personal deal ledger.',
                  },
                  {
                    id: 'BROKER_MANAGER',
                    name: '👔 Broker Manager',
                    desc: 'Team lead, MahaRERA audit approvals, team deals & routing.',
                  },
                  {
                    id: 'SUPER_ADMIN',
                    name: '👑 Super Admin',
                    desc: 'Unrestricted full firm authority across all financial & audit suites.',
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
                <span>Configured credentials activate instantly.</span>
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

      {/* Generated Activation / Set Password Link Modal */}
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
                className="p-1.5 rounded-lg text-content-muted hover:text-content hover:bg-surface cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-surface-subtle border border-border space-y-2">
                <div className="text-[11px] font-bold text-content-muted uppercase font-mono">
                  Activation URL (Valid for 7 Days)
                </div>
                <div className="p-2.5 bg-surface border border-border rounded-xl font-mono text-xs text-content break-all select-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}${createdInviteInfo.inviteUrl}` : createdInviteInfo.inviteUrl}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="w-full"
                  leftIcon={copiedInvite ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  onClick={() => {
                    const fullUrl = `${window.location.origin}${createdInviteInfo.inviteUrl}`;
                    navigator.clipboard.writeText(fullUrl);
                    setCopiedInvite(true);
                    setTimeout(() => setCopiedInvite(false), 2000);
                  }}
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


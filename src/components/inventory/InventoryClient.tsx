'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  AlertTriangle, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  Calculator, 
  Clock, 
  Eye, 
  ExternalLink,
  MapPin,
  Sparkles,
  Search,
  Filter,
  Check,
  Flame,
  Star,
  Image as ImageIcon,
  Video,
  FileText,
  Phone,
  Layers,
  ChevronDown,
  ChevronUp,
  Table,
  LayoutGrid,
  X,
  Pencil
} from 'lucide-react';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { MediaUploader, type MediaAsset } from '@/components/inventory/MediaUploader';

export function InventoryClient({
  initialUnits = [],
  initialProjects = [],
}: {
  initialUnits?: any[];
  initialProjects?: any[];
}) {
  const [units, setUnits] = useState<any[]>(initialUnits);
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState('ALL');
  const [selectedBhk, setSelectedBhk] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Modals state
  const [verifyModalUnit, setVerifyModalUnit] = useState<any | null>(null);
  const [auditNotes, setAuditNotes] = useState('');
  const [targetStatus, setTargetStatus] = useState('ACTIVE_MARKETABLE');
  const [submittingAudit, setSubmittingAudit] = useState(false);
  const [auditSuccessMsg, setAuditSuccessMsg] = useState('');

  // Quick Calculator Preview Modal
  const [calcModalUnit, setCalcModalUnit] = useState<any | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // Add Property Unit Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [unitForm, setUnitForm] = useState({
    projectId: initialProjects[0]?.id || '',
    unitNumber: 'A-1204',
    bhk: 2,
    bathrooms: 2,
    balconies: 1,
    floorNumber: 12,
    totalFloors: 22,
    carpetAreaSqft: 685,
    facing: 'EAST',
    possessionStatus: 'READY_TO_MOVE',
    possessionDate: '2026-12-31',
    agreementValue: 6800000,
    stampDutyRate: 6.0,
    registrationFee: 30000,
    parkingCharges: 250000,
    societyDevelopmentCharges: 150000,
    verificationStatus: 'ACTIVE_MARKETABLE',
    verificationNotes: 'Physically inspected sample unit and developer inventory sheet.',
    description: '',
    featureHighlights: [] as string[],
    floorPlanUrl: '',
    mediaGallery: [] as MediaAsset[],
    videoReelUrl: '',
    photoUrls: [] as string[],
    isHotDeal: true,
    isExclusive: false,
  });
  const [creatingUnit, setCreatingUnit] = useState(false);

  // Add Developer Project Form State
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    developerName: 'Crown Lifespaces',
    projectName: 'Crown Heights Luxury Towers',
    reraNumber: 'P52000018920',
    microMarket: 'Kharghar Sector 35',
    subLocality: 'Upper Kharghar Valley Road',
    shortDescription: '',
    description: '',
    locationDescription: '',
    keyHighlights: [] as string[],
    mediaGallery: [] as MediaAsset[],
    coverImageUrl: '',
    distanceToMetroKm: 0.45,
    hasOccupancyCertificate: true,
    commencementCertificateDate: '2021-03-15',
    expectedPossessionDate: '2026-12-31',
    totalTowers: 2,
    totalFloors: 22,
    basePricePerSqft: 14850,
    brochureUrl: '',
    youtubeWalkthroughUrl: '',
    masterPlanUrl: '',
    amenities: ['Clubhouse', 'Swimming Pool', 'Gymnasium', 'Valley Facing Views'],
    developerSalesPocName: 'Vikram Joshi',
    developerSalesPocPhone: '+919819001122',
    standardCommissionPercent: 2.5,
  });
  const [creatingProject, setCreatingProject] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    setRequestError(null);
    try {
      const [uRes, pRes] = await Promise.all([
        fetch('/api/v1/inventory/units'),
        fetch('/api/v1/inventory/projects'),
      ]);
      const uData = await uRes.json();
      const pData = await pRes.json();

      if (!uRes.ok || !uData.success) throw new Error(uData.error || 'Inventory units could not be loaded.');
      if (!pRes.ok || !pData.success) throw new Error(pData.error || 'Developer projects could not be loaded.');
      setUnits(uData.data);
      if (pData.success) {
        setProjects(pData.data);
        if (!unitForm.projectId && pData.data.length > 0) {
          setUnitForm((prev) => ({ ...prev, projectId: pData.data[0].id }));
        }
      }
    } catch (err: any) {
      setRequestError(err.message || 'Inventory could not be loaded. Check your connection, then try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyModalUnit) return;
    setActionError(null);
    setSubmittingAudit(true);
    try {
      const res = await fetch(`/api/v1/inventory/units/${verifyModalUnit.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStatus,
          auditNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuditSuccessMsg('Broker review recorded and freshness date updated.');
        setTimeout(() => {
          setVerifyModalUnit(null);
          setAuditSuccessMsg('');
          fetchInventory();
        }, 1200);
      } else {
        setActionError(data.error || 'The inventory update could not be recorded. Review the status and notes, then try again.');
      }
    } catch (err: any) {
      setActionError(err.message || 'The inventory update request could not be completed. Check your connection, then try again.');
    } finally {
      setSubmittingAudit(false);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.projectId) {
      setActionError('Select a developer project before creating the unit.');
      return;
    }
    setActionError(null);
    setCreatingUnit(true);
    try {
      const res = await fetch(editingUnitId ? `/api/v1/inventory/units/${editingUnitId}` : '/api/v1/inventory/units', {
        method: editingUnitId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...unitForm,
          bhk: Number(unitForm.bhk),
          bathrooms: Number(unitForm.bathrooms),
          balconies: Number(unitForm.balconies),
          floorNumber: Number(unitForm.floorNumber),
          totalFloors: Number(unitForm.totalFloors),
          carpetAreaSqft: Number(unitForm.carpetAreaSqft),
          agreementValue: Number(unitForm.agreementValue),
          parkingCharges: Number(unitForm.parkingCharges),
          societyDevelopmentCharges: Number(unitForm.societyDevelopmentCharges),
          description: unitForm.description,
          featureHighlights: unitForm.featureHighlights,
          floorPlanUrl: unitForm.floorPlanUrl,
          mediaGallery: unitForm.mediaGallery,
          photoGallery: unitForm.photoUrls,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddModal(false);
        setEditingUnitId(null);
        fetchInventory();
      } else {
        setActionError(data.error || 'The property unit could not be created. Review the fields, then try again.');
      }
    } catch (err: any) {
      setActionError(err.message || 'The property unit request could not be completed. Check your connection, then try again.');
    } finally {
      setCreatingUnit(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setCreatingProject(true);
    try {
      const res = await fetch(editingProjectId ? `/api/v1/inventory/projects/${editingProjectId}` : '/api/v1/inventory/projects', {
        method: editingProjectId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectForm,
          distanceToMetroKm: Number(projectForm.distanceToMetroKm),
          totalTowers: Number(projectForm.totalTowers),
          totalFloors: Number(projectForm.totalFloors),
          basePricePerSqft: Number(projectForm.basePricePerSqft),
          standardCommissionPercent: Number(projectForm.standardCommissionPercent),
          shortDescription: projectForm.shortDescription,
          description: projectForm.description,
          locationDescription: projectForm.locationDescription,
          keyHighlights: projectForm.keyHighlights,
          mediaGallery: projectForm.mediaGallery,
          coverImageUrl: projectForm.coverImageUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddProjectModal(false);
        setEditingProjectId(null);
        fetchInventory();
      } else {
        setActionError(data.error || 'The developer project could not be created. Review the fields, then try again.');
      }
    } catch (err: any) {
      setActionError(err.message || 'The developer project request could not be completed. Check your connection, then try again.');
    } finally {
      setCreatingProject(false);
    }
  };

  const openNewProject = () => {
    setActionError(null);
    setEditingProjectId(null);
    setShowAddProjectModal(true);
  };

  const openEditProject = (project: any) => {
    setActionError(null);
    setEditingProjectId(project.id);
    setProjectForm((prev) => ({
      ...prev,
      ...project,
      subLocality: project.subLocality || '',
      shortDescription: project.shortDescription || '',
      description: project.description || '',
      locationDescription: project.locationDescription || '',
      brochureUrl: project.brochureUrl || '',
      youtubeWalkthroughUrl: project.youtubeWalkthroughUrl || '',
      masterPlanUrl: project.masterPlanUrl || '',
      developerSalesPocName: project.developerSalesPocName || '',
      developerSalesPocPhone: project.developerSalesPocPhone || '',
      latitude: project.latitude ?? undefined,
      longitude: project.longitude ?? undefined,
      distanceToMetroKm: project.distanceToMetroKm ?? 0,
      commencementCertificateDate: project.commencementCertificateDate ? String(project.commencementCertificateDate).slice(0, 10) : '',
      expectedPossessionDate: project.expectedPossessionDate ? String(project.expectedPossessionDate).slice(0, 10) : '',
      amenities: Array.isArray(project.amenities) ? project.amenities : [],
      keyHighlights: Array.isArray(project.keyHighlights) ? project.keyHighlights : [],
      mediaGallery: Array.isArray(project.mediaGallery) ? project.mediaGallery : [],
      coverImageUrl: project.coverImageUrl || '',
    }));
    setShowAddProjectModal(true);
  };

  const openNewUnit = () => {
    setActionError(null);
    setEditingUnitId(null);
    setShowAddModal(true);
  };

  const openEditUnit = (unit: any) => {
    setActionError(null);
    setEditingUnitId(unit.id);
    setUnitForm((prev) => ({
      ...prev,
      ...unit,
      projectId: unit.projectId || unit.project?.id || prev.projectId,
      unitNumber: unit.unitNumber || '',
      possessionDate: unit.possessionDate ? String(unit.possessionDate).slice(0, 10) : '',
      description: unit.description || '',
      verificationNotes: unit.verificationNotes || '',
      featureHighlights: Array.isArray(unit.featureHighlights) ? unit.featureHighlights : [],
      floorPlanUrl: unit.floorPlanUrl || '',
      mediaGallery: Array.isArray(unit.mediaGallery) ? unit.mediaGallery : [],
      photoUrls: Array.isArray(unit.photoGallery) ? unit.photoGallery : [],
      videoReelUrl: unit.videoReelUrl || '',
    }));
    setShowAddModal(true);
  };

  const formatINR = (val: number) => {
    if (!val && val !== 0) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const filteredUnits = units.filter((u) => {
    const matchesMarket = selectedMarket === 'ALL' || u.project?.microMarket === selectedMarket;
    const matchesBhk = selectedBhk === 'ALL' || String(u.bhk) === selectedBhk;
    const matchesStatus = selectedStatus === 'ALL' || u.freshness?.effectiveMarketableStatus === selectedStatus;
    const matchesSearch =
      !searchQuery ||
      (u.project?.projectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.project?.reraNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.unitNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.project?.microMarket || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMarket && matchesBhk && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#b59658]/20">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/40 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#b59658]" /> RERA IDS RECORDED
            </span>
            <HallmarkStamp type="audit" label="14-day freshness rule" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-display">
            Inventory Records &amp; Freshness
          </h1>
          <p className="text-slate-400 text-xs mt-0.5 font-mono">
            RERA ID format checks, broker update history, 14-day freshness status, and calculated all-in costs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-lg bg-[#12151f] border border-[#b59658]/20 mr-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Show inventory table"
              aria-pressed={viewMode === 'table'}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-[#1b202c] text-[#ccb67b] font-bold' : 'text-slate-400 hover:text-white'}`}
              title="Dense Table View"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              aria-label="Show inventory cards"
              aria-pressed={viewMode === 'cards'}
              className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-[#1b202c] text-[#ccb67b] font-bold' : 'text-slate-400 hover:text-white'}`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={openNewProject}
            className="px-3.5 py-2 rounded-lg bg-[#1b202c] hover:bg-[#2a3040] text-[#ccb67b] border border-[#b59658]/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-[#ccb67b]" />
            Add Project
          </button>
          <button
            type="button"
            onClick={openNewUnit}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#b59658]/20 border border-[#ccb67b]/60 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Unit
          </button>
          <button
            type="button"
            onClick={fetchInventory}
            disabled={loading}
            aria-label="Refresh inventory"
            className="min-h-11 min-w-11 px-3 py-2 rounded-lg bg-[#12151f] hover:bg-[#1b202c] text-slate-300 border border-[#b59658]/20 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {requestError && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">
          <p>{requestError}</p>
          <button type="button" onClick={fetchInventory} className="mt-1 min-h-11 font-bold text-white underline underline-offset-2">Retry inventory</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-xl bg-[#1b202c]/90 border border-[#b59658]/30 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <label htmlFor="inventory-search" className="sr-only">Search inventory records</label>
          <input
            id="inventory-search"
            name="inventorySearch"
            type="text"
            placeholder="Search by project, unit number, RERA ID, or micro-market…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12151f] border border-[#b59658]/20 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ccb67b]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            id="inventory-market"
            name="market"
            aria-label="Filter by micro-market"
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            className="bg-[#12151f] border border-[#b59658]/20 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#ccb67b]"
          >
            <option value="ALL">All Micro-Markets</option>
            <option value="Kharghar Sector 35">Kharghar Sector 35</option>
            <option value="Kharghar Sector 36">Kharghar Sector 36</option>
            <option value="Kharghar Sector 20">Kharghar Sector 20</option>
            <option value="Taloja Phase 1">Taloja Phase 1</option>
          </select>

          <select
            id="inventory-bhk"
            name="bhk"
            aria-label="Filter by configuration"
            value={selectedBhk}
            onChange={(e) => setSelectedBhk(e.target.value)}
            className="bg-[#12151f] border border-[#b59658]/20 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#ccb67b]"
          >
            <option value="ALL">All Configurations</option>
            <option value="1">1 BHK</option>
            <option value="2">2 BHK</option>
            <option value="3">3 BHK</option>
          </select>

          <select
            id="inventory-status"
            name="verificationStatus"
            aria-label="Filter by audit status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#12151f] border border-[#b59658]/20 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#ccb67b]"
          >
            <option value="ALL">All Audit Statuses</option>
            <option value="ACTIVE_MARKETABLE">Active Marketable (&lt;14d)</option>
            <option value="STALE_EXPIRED">Stale Expired (&gt;14d)</option>
          </select>
        </div>
      </div>

      <section aria-labelledby="project-catalogue-title" className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <h2 id="project-catalogue-title" className="font-display text-sm font-bold uppercase tracking-wider text-slate-300">Project catalogue</h2>
            <p className="mt-1 text-[11px] text-slate-500">Maintain the story, location context, media, and RERA profile clients will see.</p>
          </div>
          <span className="font-mono text-[10px] text-[#ccb67b]">{projects.length} projects</span>
        </div>
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const cover = project.coverImageUrl || project.mediaGallery?.find((asset: MediaAsset) => asset.kind === 'image')?.url;
              return (
                <article key={project.id} className="overflow-hidden rounded-xl border border-[#b59658]/25 bg-[#1b202c]/90">
                  <div className="flex min-h-24 items-center gap-3 border-b border-[#b59658]/15 bg-[#12151f] p-3">
                    {cover ? <img src={cover} alt="" className="h-16 w-20 rounded-md object-cover" /> : <div className="grid h-16 w-20 place-items-center rounded-md border border-dashed border-[#b59658]/30 text-slate-500"><Building2 className="h-5 w-5" /></div>}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-sm font-bold text-white">{project.projectName}</h3>
                      <p className="truncate text-[10px] text-slate-400">{project.developerName} • {project.microMarket}</p>
                      <p className="mt-1 font-mono text-[10px] text-[#ccb67b]">{project.unitCount || 0} units • {project.activeUnitCount || 0} marketable</p>
                    </div>
                    <button type="button" onClick={() => openEditProject(project)} aria-label={`Edit ${project.projectName}`} title="Edit project" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#b59658]/30 text-[#ccb67b] hover:bg-[#2a3040]"><Pencil className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="space-y-2 p-3 text-[10px] text-slate-400">
                    <p className="line-clamp-2 min-h-8">{project.shortDescription || 'Description pending broker update.'}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(project.keyHighlights || []).slice(0, 3).map((highlight: string) => <span key={highlight} className="rounded border border-[#b59658]/20 px-1.5 py-1 text-[#ccb67b]">{highlight}</span>)}
                      {!(project.keyHighlights || []).length && <span className="text-slate-500">Add highlights and media for a client-ready presentation.</span>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#b59658]/25 bg-[#12151f] p-6 text-center text-xs text-slate-400">No projects yet. Add a project to start building a polished client catalogue.</div>
        )}
      </section>

      {/* DENSE TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="rounded-xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#12151f]/90 text-slate-400 uppercase text-[10px] border-b border-[#b59658]/20">
                <tr>
                  <th className="p-3 pl-4">Project &amp; Developer</th>
                  <th className="p-3">Unit / Floor</th>
                  <th className="p-3">Config &amp; Carpet</th>
                  <th className="p-3 text-right">Agreement Value</th>
                  <th className="p-3 text-right">All-In Cost (C_all-in)</th>
                  <th className="p-3">RERA ID</th>
                  <th className="p-3 text-center">Broker Update</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#b59658]/10 text-slate-300">
                {filteredUnits.map((unit) => {
                  const isFresh = unit.freshness?.effectiveMarketableStatus === 'ACTIVE_MARKETABLE';
                  const isStale = unit.freshness?.effectiveMarketableStatus === 'STALE_EXPIRED';
                  const daysAgo = unit.freshness?.daysSinceVerification ?? 0;

                  return (
                    <tr key={unit.id} className={`hover:bg-[#12151f]/70 transition-colors ${isStale ? 'bg-red-950/20' : ''}`}>
                      <td className="p-3 pl-4">
                        <div className="font-bold text-white font-sans text-sm">{unit.project?.projectName}</div>
                        <div className="text-[10px] text-slate-400">{unit.project?.developerName} • {unit.project?.microMarket}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-200">Unit {unit.unitNumber || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400">Floor {unit.floorNumber} of {unit.totalFloors}</div>
                      </td>

                      <td className="p-3">
                        <div className="text-amber-300 font-bold">{unit.bhk} BHK • {unit.facing}</div>
                        <div className="text-[10px] text-slate-400">{unit.carpetAreaSqft} sq.ft carpet</div>
                      </td>

                      <td className="p-3 text-right font-bold text-slate-200">
                        {formatINR(unit.agreementValue)}
                      </td>

                      <td className="p-3 text-right">
                        <div className="font-bold text-[#ccb67b]">{formatINR(unit.allInTotalCost)}</div>
                        <button
                          onClick={() => setCalcModalUnit(unit)}
                          className="text-[10px] text-slate-400 hover:text-[#ccb67b] underline cursor-pointer"
                        >
                          View Breakdown
                        </button>
                      </td>

                      <td className="p-3">
                        <HallmarkStamp
                          type="rera"
                          code={unit.project?.reraNumber}
                          label="Format checked"
                          size="sm"
                        />
                      </td>

                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          isFresh
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                            : 'bg-red-950/70 text-red-300 border border-red-500/40 animate-pulse'
                        }`}>
                          {isFresh ? `Updated ${daysAgo}d ago` : `Stale: ${daysAgo}d old`}
                        </span>
                      </td>

                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button" onClick={() => openEditUnit(unit)} aria-label={`Edit unit ${unit.unitNumber || 'record'}`} title="Edit unit" className="grid h-9 w-9 place-items-center rounded-lg border border-[#b59658]/30 text-[#ccb67b] hover:bg-[#2a3040]"><Pencil className="h-3.5 w-3.5" /></button>
                          <button
                            type="button"
                            onClick={() => {
                              setVerifyModalUnit(unit);
                              setTargetStatus(unit.verificationStatus);
                              setAuditNotes(unit.verificationNotes || '');
                            }}
                            className="min-h-9 rounded bg-[#12151f] px-2.5 py-1 text-[11px] font-semibold text-[#ccb67b] shadow-sm transition-all hover:bg-[#2a3040]"
                          >
                            Record Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUnits.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                      No property records match the current criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CARD GRID VIEW */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUnits.map((unit) => {
            return (
              <div key={unit.id} className="p-5 rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-base font-sans font-display">{unit.project?.projectName}</h3>
                    <p className="text-[11px] text-slate-400">Unit {unit.unitNumber} ({unit.bhk} BHK • {unit.carpetAreaSqft} sqft)</p>
                  </div>
                  <HallmarkStamp type="rera" code={unit.project?.reraNumber} size="sm" />
                </div>
                <div className="pt-2 border-t border-[#b59658]/10 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total All-In Cost:</span>
                    <strong className="text-white text-sm font-bold">{formatINR(unit.allInTotalCost)}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditUnit(unit)}
                    aria-label={`Edit unit ${unit.unitNumber || 'record'}`}
                    title="Edit unit"
                    className="grid h-9 w-9 place-items-center rounded border border-[#b59658]/30 bg-[#12151f] text-[#ccb67b] hover:bg-[#2a3040]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyModalUnit(unit);
                      setTargetStatus(unit.verificationStatus);
                      setAuditNotes(unit.verificationNotes || '');
                    }}
                    className="px-3 py-1.5 rounded bg-[#12151f] hover:bg-[#2a3040] text-[#ccb67b] border border-[#b59658]/30 font-semibold text-xs cursor-pointer"
                  >
                    Record Update
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD DEVELOPER PROJECT                                            */}
      {/* ========================================================================= */}
      <AccessibleDialog
        open={showAddProjectModal}
        onClose={() => setShowAddProjectModal(false)}
        titleId="add-project-title"
        descriptionId="add-project-description"
        panelClassName="max-w-xl bg-[#1b202c] border border-[#b59658]/40 rounded-2xl p-6 space-y-4 shadow-2xl font-mono text-xs"
      >
            <div className="flex items-center justify-between pb-3 border-b border-[#b59658]/20">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#b59658]" />
                <div>
                  <h2 id="add-project-title" className="font-bold text-white text-base font-display">{editingProjectId ? 'Edit developer project' : 'Add developer project and RERA profile'}</h2>
                  <p id="add-project-description" className="mt-1 text-[11px] text-slate-400">Shape the project story, media, location context, and commercial record used in client proposals.</p>
                </div>
              </div>
              <button type="button" data-dialog-close aria-label="Close project form" onClick={() => { setShowAddProjectModal(false); setEditingProjectId(null); }} className="min-h-11 min-w-11 text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">{actionError}</div>}

            <form onSubmit={handleCreateProject} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Developer / Builder Name *</label>
                  <input
                    type="text"
                    aria-label="Developer or builder name"
                    data-dialog-autofocus
                    required
                    placeholder="e.g. Crown Lifespaces"
                    value={projectForm.developerName}
                    onChange={(e) => setProjectForm({ ...projectForm, developerName: e.target.value })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#ccb67b]"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Project Name *</label>
                  <input
                    type="text"
                    aria-label="Project name"
                    required
                    placeholder="e.g. Crown Heights Luxury"
                    value={projectForm.projectName}
                    onChange={(e) => setProjectForm({ ...projectForm, projectName: e.target.value })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#ccb67b]"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-[#b59658]/15 bg-[#12151f] p-3">
                <div>
                  <label className="text-slate-300 block mb-1">Client-facing one-line summary</label>
                  <input aria-label="Project short description" type="text" maxLength={240} placeholder="A calm, design-led address with valley-facing residences" value={projectForm.shortDescription} onChange={(e) => setProjectForm({ ...projectForm, shortDescription: e.target.value })} className="w-full bg-[#1b202c] border border-[#b59658]/25 rounded-lg p-2 text-white placeholder-slate-500" />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Project description</label>
                  <textarea aria-label="Project description" rows={4} maxLength={4000} placeholder="Describe the design intent, living experience, delivery context, and what makes the project relevant to this client." value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} className="w-full bg-[#1b202c] border border-[#b59658]/25 rounded-lg p-2 text-white placeholder-slate-500" />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Location story</label>
                  <textarea aria-label="Project location description" rows={2} maxLength={1000} placeholder="Explain access, nearby transit, schools, retail, and the micro-market in human terms." value={projectForm.locationDescription} onChange={(e) => setProjectForm({ ...projectForm, locationDescription: e.target.value })} className="w-full bg-[#1b202c] border border-[#b59658]/25 rounded-lg p-2 text-white placeholder-slate-500" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-slate-300 block mb-1">Key highlights <span className="text-slate-500">(one per line)</span></label>
                    <textarea aria-label="Project key highlights" rows={4} placeholder="Valley-facing balconies\nLow-density two-tower plan\nWalkable metro access" value={projectForm.keyHighlights.join('\n')} onChange={(e) => setProjectForm({ ...projectForm, keyHighlights: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} className="w-full bg-[#1b202c] border border-[#b59658]/25 rounded-lg p-2 text-white placeholder-slate-500" />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Amenities <span className="text-slate-500">(one per line)</span></label>
                    <textarea aria-label="Project amenities" rows={4} placeholder="Clubhouse\nSwimming pool\nFitness studio" value={projectForm.amenities.join('\n')} onChange={(e) => setProjectForm({ ...projectForm, amenities: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} className="w-full bg-[#1b202c] border border-[#b59658]/25 rounded-lg p-2 text-white placeholder-slate-500" />
                  </div>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Cover image URL <span className="text-slate-500">(optional; uploaded gallery can be used automatically)</span></label>
                  <input aria-label="Project cover image URL" type="url" placeholder="https://…" value={projectForm.coverImageUrl} onChange={(e) => setProjectForm({ ...projectForm, coverImageUrl: e.target.value })} className="w-full bg-[#1b202c] border border-[#b59658]/25 rounded-lg p-2 text-white placeholder-slate-500" />
                </div>
                <MediaUploader value={projectForm.mediaGallery} onChange={(mediaGallery) => setProjectForm({ ...projectForm, mediaGallery })} label="Project gallery" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">MahaRERA Registration Number *</label>
                  <input
                    type="text"
                    aria-label="RERA registration number"
                    required
                    placeholder="e.g. P52000018920"
                    value={projectForm.reraNumber}
                    onChange={(e) => setProjectForm({ ...projectForm, reraNumber: e.target.value.toUpperCase() })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white placeholder-slate-500 font-bold text-amber-300 focus:outline-none focus:border-[#ccb67b]"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Micro-Market Locality *</label>
                  <select aria-label="Micro-market locality"
                    value={projectForm.microMarket}
                    onChange={(e) => setProjectForm({ ...projectForm, microMarket: e.target.value })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white focus:outline-none focus:border-[#ccb67b]"
                  >
                    <option value="Kharghar Sector 35">Kharghar Sector 35</option>
                    <option value="Kharghar Sector 36">Kharghar Sector 36</option>
                    <option value="Kharghar Sector 20">Kharghar Sector 20</option>
                    <option value="Taloja Phase 1">Taloja Phase 1</option>
                    <option value="Upper Kharghar">Upper Kharghar</option>
                    <option value="Roadpali">Roadpali</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Distance to Metro (Km)</label>
                  <input aria-label="Distance to metro in kilometres"
                    type="number"
                    step="0.05"
                    value={projectForm.distanceToMetroKm}
                    onChange={(e) => setProjectForm({ ...projectForm, distanceToMetroKm: Number(e.target.value) })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Base Price / Sqft (₹)</label>
                  <input aria-label="Base price per square foot"
                    type="number"
                    step="50"
                    value={projectForm.basePricePerSqft}
                    onChange={(e) => setProjectForm({ ...projectForm, basePricePerSqft: Number(e.target.value) })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Std Commission %</label>
                  <input aria-label="Standard commission percentage"
                    type="number"
                    step="0.1"
                    value={projectForm.standardCommissionPercent}
                    onChange={(e) => setProjectForm({ ...projectForm, standardCommissionPercent: Number(e.target.value) })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Developer Sales POC Name</label>
                  <input aria-label="Developer sales point of contact name"
                    type="text"
                    placeholder="e.g. Vikram Joshi"
                    value={projectForm.developerSalesPocName}
                    onChange={(e) => setProjectForm({ ...projectForm, developerSalesPocName: e.target.value })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Developer Sales POC Mobile</label>
                  <input aria-label="Developer sales point of contact mobile"
                    type="text"
                    placeholder="+91 98190 01122"
                    value={projectForm.developerSalesPocPhone}
                    onChange={(e) => setProjectForm({ ...projectForm, developerSalesPocPhone: e.target.value })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#12151f] border border-[#b59658]/20 flex items-center justify-between">
                <div>
                  <span className="text-white font-bold block">Occupancy Certificate (OC) Received</span>
                  <span className="text-[10px] text-slate-400">If checked, buyers pay 0% statutory GST.</span>
                </div>
                <input aria-label="Occupancy certificate received"
                  type="checkbox"
                  checked={projectForm.hasOccupancyCertificate}
                  onChange={(e) => setProjectForm({ ...projectForm, hasOccupancyCertificate: e.target.checked })}
                  className="w-4 h-4 accent-[#ccb67b] cursor-pointer"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#b59658]/20">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="min-h-11 px-3 py-1.5 rounded-lg bg-[#12151f] text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProject}
                  className="min-h-11 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] font-bold shadow-md cursor-pointer"
                >
                  {creatingProject ? 'Saving…' : editingProjectId ? 'Save project changes' : 'Register project'}
                </button>
              </div>
            </form>
      </AccessibleDialog>

      {/* ========================================================================= */}
      {/* MODAL 2: ADD PROPERTY UNIT                                                */}
      {/* ========================================================================= */}
      <AccessibleDialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        titleId="add-unit-title"
        descriptionId="add-unit-description"
        panelClassName="max-w-xl bg-[#1b202c] border border-[#b59658]/40 rounded-2xl p-6 space-y-4 shadow-2xl font-mono text-xs"
      >
            <div className="flex items-center justify-between pb-3 border-b border-[#b59658]/20">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#b59658]" />
                <div>
                  <h2 id="add-unit-title" className="font-bold text-white text-base font-display">{editingUnitId ? 'Edit property unit' : 'Add property unit'}</h2>
                  <p id="add-unit-description" className="mt-1 text-[11px] text-slate-400">Capture the unit story, floor plan, media, and transparent commercial inputs for a client-ready presentation.</p>
                </div>
              </div>
              <button type="button" data-dialog-close aria-label="Close unit form" onClick={() => { setShowAddModal(false); setEditingUnitId(null); }} className="min-h-11 min-w-11 text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">{actionError}</div>}

            <form onSubmit={handleCreateUnit} className="space-y-3.5">
              <div>
                <label className="text-slate-300 block mb-1">Developer Project *</label>
                <select aria-label="Developer project"
                  data-dialog-autofocus
                  value={unitForm.projectId}
                  onChange={(e) => setUnitForm({ ...unitForm, projectId: e.target.value })}
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white focus:outline-none focus:border-[#ccb67b]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName} ({p.developerName} • {p.microMarket})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Unit Number</label>
                  <input aria-label="Unit number"
                    type="text"
                    placeholder="e.g. A-1204"
                    value={unitForm.unitNumber}
                    onChange={(e) => setUnitForm({ ...unitForm, unitNumber: e.target.value })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">BHK Config</label>
                  <select aria-label="BHK configuration"
                    value={unitForm.bhk}
                    onChange={(e) => setUnitForm({ ...unitForm, bhk: Number(e.target.value) })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  >
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4 BHK</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Carpet Area (Sq.Ft) *</label>
                  <input aria-label="Carpet area in square feet"
                    type="number"
                    required
                    value={unitForm.carpetAreaSqft}
                    onChange={(e) => setUnitForm({ ...unitForm, carpetAreaSqft: Number(e.target.value) })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-slate-300 block mb-1">Bathrooms</label>
                  <input aria-label="Number of bathrooms" type="number" min={1} value={unitForm.bathrooms} onChange={(e) => setUnitForm({ ...unitForm, bathrooms: Number(e.target.value) })} className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Balconies</label>
                  <input aria-label="Number of balconies" type="number" min={0} value={unitForm.balconies} onChange={(e) => setUnitForm({ ...unitForm, balconies: Number(e.target.value) })} className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Floor Number</label>
                  <input aria-label="Floor number"
                    type="number"
                    value={unitForm.floorNumber}
                    onChange={(e) => setUnitForm({ ...unitForm, floorNumber: Number(e.target.value) })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Total Floors</label>
                  <input aria-label="Total floors"
                    type="number"
                    value={unitForm.totalFloors}
                    onChange={(e) => setUnitForm({ ...unitForm, totalFloors: Number(e.target.value) })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Facing</label>
                  <select aria-label="Unit facing"
                    value={unitForm.facing}
                    onChange={(e) => setUnitForm({ ...unitForm, facing: e.target.value })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  >
                    <option value="EAST">EAST</option>
                    <option value="WEST">WEST</option>
                    <option value="NORTH">NORTH</option>
                    <option value="SOUTH">SOUTH</option>
                    <option value="NORTH_EAST">NORTH_EAST</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Agreement Base Value (₹) *</label>
                  <input aria-label="Agreement base value"
                    type="number"
                    required
                    step="10000"
                    value={unitForm.agreementValue}
                    onChange={(e) => setUnitForm({ ...unitForm, agreementValue: Number(e.target.value) })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white font-bold text-[#ccb67b]"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Possession Status</label>
                  <select aria-label="Possession status"
                    value={unitForm.possessionStatus}
                    onChange={(e) => setUnitForm({ ...unitForm, possessionStatus: e.target.value })}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  >
                    <option value="READY_TO_MOVE">READY_TO_MOVE (0% GST with OC)</option>
                    <option value="UNDER_CONSTRUCTION">UNDER_CONSTRUCTION (5% GST)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-[#b59658]/15 bg-[#12151f] p-3">
                <div>
                  <label className="text-slate-300 block mb-1">Client-facing unit description</label>
                  <textarea aria-label="Unit description" rows={4} maxLength={4000} placeholder="Describe the light, outlook, layout, finishes, and the kind of buyer this home suits." value={unitForm.description} onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })} className="w-full bg-[#1b202c] border border-[#b59658]/25 rounded-lg p-2 text-white placeholder-slate-500" />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Feature highlights <span className="text-slate-500">(one per line)</span></label>
                  <textarea aria-label="Unit feature highlights" rows={3} placeholder="Corner living room\nMorning light\nTwo covered parking bays" value={unitForm.featureHighlights.join('\n')} onChange={(e) => setUnitForm({ ...unitForm, featureHighlights: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} className="w-full bg-[#1b202c] border border-[#b59658]/25 rounded-lg p-2 text-white placeholder-slate-500" />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Floor plan URL <span className="text-slate-500">(optional)</span></label>
                  <input aria-label="Floor plan URL" type="url" placeholder="https://…" value={unitForm.floorPlanUrl} onChange={(e) => setUnitForm({ ...unitForm, floorPlanUrl: e.target.value })} className="w-full bg-[#1b202c] border border-[#b59658]/25 rounded-lg p-2 text-white placeholder-slate-500" />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">External walkthrough URL <span className="text-slate-500">(optional)</span></label>
                  <input aria-label="External walkthrough URL" type="url" placeholder="YouTube, Vimeo, or builder walkthrough link" value={unitForm.videoReelUrl} onChange={(e) => setUnitForm({ ...unitForm, videoReelUrl: e.target.value })} className="w-full bg-[#1b202c] border border-[#b59658]/25 rounded-lg p-2 text-white placeholder-slate-500" />
                </div>
                <MediaUploader value={unitForm.mediaGallery} onChange={(mediaGallery) => setUnitForm({ ...unitForm, mediaGallery, photoUrls: mediaGallery.filter((asset) => asset.kind === 'image').map((asset) => asset.url) })} label="Unit gallery and walkthrough" />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Audit Log / Inspection Verification Notes</label>
                <textarea aria-label="Audit log and inspection verification notes"
                  rows={2}
                  value={unitForm.verificationNotes}
                  onChange={(e) => setUnitForm({ ...unitForm, verificationNotes: e.target.value })}
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#b59658]/20">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="min-h-11 px-3 py-1.5 rounded-lg bg-[#12151f] text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUnit}
                  className="min-h-11 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] font-bold shadow-md cursor-pointer"
                >
                  {creatingUnit ? 'Saving…' : editingUnitId ? 'Save unit changes' : 'Add property unit'}
                </button>
              </div>
            </form>
      </AccessibleDialog>

      {/* ========================================================================= */}
      {/* MODAL 3: RE-VERIFICATION AUDIT                                            */}
      {/* ========================================================================= */}
      <AccessibleDialog
        open={Boolean(verifyModalUnit)}
        onClose={() => setVerifyModalUnit(null)}
        titleId="verify-unit-title"
        descriptionId="verify-unit-description"
        panelClassName="max-w-md bg-[#1b202c] border border-[#b59658]/40 rounded-2xl p-6 space-y-4 shadow-2xl font-mono text-xs"
      >
        {verifyModalUnit && (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-[#b59658]/20">
              <div>
              <h2 id="verify-unit-title" className="font-bold text-white text-sm font-display flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#b59658]" />
                Inventory update record
              </h2>
              <p id="verify-unit-description" className="mt-1 text-[11px] text-slate-400">Record the source and status used for the freshness date.</p>
              </div>
              <button type="button" data-dialog-close aria-label="Close inventory update" onClick={() => setVerifyModalUnit(null)} className="min-h-11 min-w-11 text-slate-400 hover:text-white">✕</button>
            </div>

            {auditSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-center">
                ✓ {auditSuccessMsg}
              </div>
            ) : (
              <>
              {actionError && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">{actionError}</div>}
              <form onSubmit={handleVerifyUnit} className="space-y-3.5">
                <div>
                  <span className="text-slate-400 block">Target Unit:</span>
                  <strong className="text-white">
                    {verifyModalUnit.project?.projectName} - Unit {verifyModalUnit.unitNumber} ({verifyModalUnit.bhk} BHK)
                  </strong>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Target Verification Status:</label>
                  <select aria-label="Target verification status"
                    data-dialog-autofocus
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  >
                    <option value="ACTIVE_MARKETABLE">ACTIVE_MARKETABLE (broker update &lt;14d)</option>
                    <option value="PHYSICALLY_AUDITED">PHYSICALLY_AUDITED (internal status)</option>
                    <option value="STALE_EXPIRED">STALE_EXPIRED</option>
                    <option value="ARCHIVED_SOLD">ARCHIVED_SOLD</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Mandatory Update Notes:</label>
                  <textarea aria-label="Mandatory update notes"
                    rows={3}
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    placeholder="Record the source, price check, availability update, or site review…"
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyModalUnit(null)}
                    className="min-h-11 px-3 py-1.5 rounded-lg bg-[#12151f] text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAudit}
                    className="min-h-11 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] font-bold shadow-md cursor-pointer"
                  >
                    {submittingAudit ? 'Recording…' : 'Record update'}
                  </button>
                </div>
              </form>
              </>
            )}
          </>
        )}
      </AccessibleDialog>

      {/* ========================================================================= */}
      {/* MODAL 4: ALL-IN COST BREAKDOWN SHEET                                      */}
      {/* ========================================================================= */}
      <AccessibleDialog
        open={Boolean(calcModalUnit)}
        onClose={() => setCalcModalUnit(null)}
        titleId="cost-sheet-title"
        descriptionId="cost-sheet-description"
        panelClassName="max-w-lg bg-[#1b202c] border border-[#b59658]/40 rounded-2xl p-6 space-y-4 shadow-2xl font-mono text-xs"
      >
        {calcModalUnit && (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-[#b59658]/20">
              <div>
                <h2 id="cost-sheet-title" className="font-bold text-white text-base font-display">Statutory all-in cost sheet</h2>
                <p id="cost-sheet-description" className="text-[10px] text-slate-400">{calcModalUnit.project?.projectName} • Unit {calcModalUnit.unitNumber}</p>
              </div>
              <button type="button" data-dialog-close aria-label="Close cost sheet" onClick={() => setCalcModalUnit(null)} className="min-h-11 min-w-11 text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2 divide-y divide-[#b59658]/10 text-slate-300">
              <div className="flex justify-between pt-1">
                <span>Agreement Base Value:</span>
                <strong className="text-white">{formatINR(calcModalUnit.agreementValue)}</strong>
              </div>
              <div className="flex justify-between pt-1">
                <span>Maharashtra Stamp Duty ({calcModalUnit.stampDutyRate}%):</span>
                <strong className="text-white">{formatINR(Math.round((calcModalUnit.agreementValue * calcModalUnit.stampDutyRate) / 100))}</strong>
              </div>
              <div className="flex justify-between pt-1">
                <span>Registration Fee (1% capped at ₹30k):</span>
                <strong className="text-white">{formatINR(calcModalUnit.registrationFee)}</strong>
              </div>
              <div className="flex justify-between pt-1">
                <span>GST ({calcModalUnit.gstRate}% {calcModalUnit.gstRate === 0 ? 'OC Received' : 'Under-Construction'}):</span>
                <strong className="text-white">{formatINR(Math.round((calcModalUnit.agreementValue * calcModalUnit.gstRate) / 100))}</strong>
              </div>
              <div className="flex justify-between pt-1">
                <span>Floor Rise Charges:</span>
                <strong className="text-white">{formatINR(calcModalUnit.floorRiseCharges)}</strong>
              </div>
              <div className="flex justify-between pt-1">
                <span>Covered Car Parking:</span>
                <strong className="text-white">{formatINR(calcModalUnit.parkingCharges)}</strong>
              </div>
              <div className="flex justify-between pt-1">
                <span>Society Development / Club Charges:</span>
                <strong className="text-white">{formatINR(calcModalUnit.societyDevelopmentCharges)}</strong>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#b59658]/30 text-sm font-bold text-[#ccb67b]">
                <span>Total All-Inclusive Capitalized Cost:</span>
                <span>{formatINR(calcModalUnit.allInTotalCost)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                data-dialog-autofocus
                onClick={() => setCalcModalUnit(null)}
                className="min-h-11 px-4 py-1.5 rounded-lg bg-[#12151f] hover:bg-[#2a3040] text-slate-200 border border-[#b59658]/30 cursor-pointer"
              >
                Close Cost Sheet
              </button>
            </div>
          </>
        )}
      </AccessibleDialog>
    </div>
  );
}

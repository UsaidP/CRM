'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Pencil,
  FileSpreadsheet,
  Upload,
  Trash2,
  FileCheck,
  Download
} from 'lucide-react';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { listUnits, listProjects, verifyUnit } from '@/lib/client/inventory';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { MediaUploader, type MediaAsset } from '@/components/inventory/MediaUploader';
import { ProjectDetailsModal } from '@/components/inventory/ProjectDetailsModal';
import { CsvImportModal } from '@/components/inventory/CsvImportModal';
import { BrochureUploadModal } from '@/components/inventory/BrochureUploadModal';
import { CustomSelect, type CustomSelectOption } from '@/components/ui/CustomSelect';
import { ReraVerificationBadge } from '@/components/inventory/ReraVerificationBadge';
import { QuickReraLookupModal } from '@/components/inventory/QuickReraLookupModal';
import { MahaReraCertificateModal } from '@/components/inventory/MahaReraCertificateModal';
import { ProjectMediaStudioModal } from '@/components/inventory/ProjectMediaStudioModal';

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
  const searchParams = useSearchParams();

  // Sync search query from URL parameter if navigated from global search
  useEffect(() => {
    const s = searchParams?.get('search');
    if (s) {
      setSearchQuery(s);
    }
  }, [searchParams]);

  // Modals state
  const [verifyModalUnit, setVerifyModalUnit] = useState<any | null>(null);
  const [auditNotes, setAuditNotes] = useState('');
  const [targetStatus, setTargetStatus] = useState('ACTIVE_MARKETABLE');
  const [submittingAudit, setSubmittingAudit] = useState(false);
  const [auditSuccessMsg, setAuditSuccessMsg] = useState('');

  // Project Details Inspector
  const [inspectProject, setInspectProject] = useState<any | null>(null);
  const [mediaStudioProject, setMediaStudioProject] = useState<any | null>(null);
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const [showQuickReraModal, setShowQuickReraModal] = useState(false);
  const [formCModalProject, setFormCModalProject] = useState<any | null>(null);

  // Quick Calculator Preview Modal
  const [calcModalUnit, setCalcModalUnit] = useState<any | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // Delete Confirmation States
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<{ id: string; name: string; unitCount: number } | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [deleteConfirmUnit, setDeleteConfirmUnit] = useState<{ id: string; unitNumber: string; projectName: string } | null>(null);
  const [deletingUnit, setDeletingUnit] = useState(false);
  const [bannerToast, setBannerToast] = useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null);
  const [inventoryTab, setInventoryTab] = useState<'units' | 'projects'>('units');

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
      const [uData, pData] = await Promise.all([listUnits(), listProjects()]);

      if (!uData.success) throw new Error(uData.error || 'Inventory units could not be loaded.');
      if (!pData.success) throw new Error(pData.error || 'Developer projects could not be loaded.');
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
      const data = await verifyUnit(verifyModalUnit.id, {
          targetStatus,
          auditNotes,
        });
      if (data.success) {
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
        setBannerToast({
          text: data.message || (editingProjectId ? `Project "${projectForm.projectName}" updated successfully.` : `Project "${projectForm.projectName}" created successfully.`),
          type: 'success',
        });
        setTimeout(() => setBannerToast(null), 5000);
      } else {
        setActionError(data.error || 'The developer project could not be created. Review the fields, then try again.');
      }
    } catch (err: any) {
      setActionError(err.message || 'The developer project request could not be completed. Check your connection, then try again.');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    setDeletingProject(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/inventory/projects/${projectId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        setUnits((prev) => prev.filter((u) => u.projectId !== projectId));
        if (inspectProject?.id === projectId) {
          setInspectProject(null);
        }
        setDeleteConfirmProject(null);
        setBannerToast({
          text: `Project "${projectName}" and all associated child units were deleted successfully.`,
          type: 'success',
        });
        setTimeout(() => setBannerToast(null), 5000);
      } else {
        setActionError(data.error || 'Failed to delete developer project.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete project. Please check your connection.');
    } finally {
      setDeletingProject(false);
    }
  };

  const handleDeleteUnit = async (unitId: string, unitNumber: string) => {
    setDeletingUnit(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/inventory/units/${unitId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUnits((prev) => prev.filter((u) => u.id !== unitId));
        setDeleteConfirmUnit(null);
        setBannerToast({
          text: `Property unit "${unitNumber}" was deleted successfully.`,
          type: 'success',
        });
        setTimeout(() => setBannerToast(null), 5000);
      } else {
        setActionError(data.error || 'Failed to delete unit.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete unit.');
    } finally {
      setDeletingUnit(false);
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
      mediaGallery: Array.isArray(project.mediaGallery)
        ? project.mediaGallery.map((asset: any, idx: number) => ({
            id: asset.id || `proj-asset-${idx}-${asset.url || Math.random().toString(36).slice(2, 7)}`,
            url: asset.url || '',
            kind: asset.kind || (asset.type === 'VIDEO' ? 'video' : 'image'),
            title: asset.title || '',
            alt: asset.alt || '',
            caption: asset.caption || '',
          }))
        : [],
      coverImageUrl: project.coverImageUrl || '',
    }));
    setShowAddProjectModal(true);
  };

  const openNewUnit = (targetProjectId?: string) => {
    setActionError(null);
    setEditingUnitId(null);
    if (targetProjectId) {
      setUnitForm((prev) => ({
        ...prev,
        projectId: targetProjectId,
      }));
    }
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
      mediaGallery: Array.isArray(unit.mediaGallery)
        ? unit.mediaGallery.map((asset: any, idx: number) => ({
            id: asset.id || `unit-asset-${idx}-${asset.url || Math.random().toString(36).slice(2, 7)}`,
            url: asset.url || '',
            kind: asset.kind || (asset.type === 'VIDEO' ? 'video' : 'image'),
            title: asset.title || '',
            alt: asset.alt || '',
            caption: asset.caption || '',
          }))
        : [],
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

  // Helper for flexible micro-market matching (handles Taloja Phase 1/2 vs Phase I/II, sublocalities, sectors)
  const matchesMarketHelper = (market: string | null | undefined, subLocality?: string | null | undefined) => {
    if (selectedMarket === 'ALL') return true;
    if (!market && !subLocality) return false;
    
    const target = selectedMarket.toLowerCase().trim();
    const candidate = `${market || ''} ${subLocality || ''}`.toLowerCase().trim();
    
    if (candidate === target || candidate.includes(target) || target.includes(candidate)) return true;
    
    // Normalize Roman numerals / phases (e.g. "phase ii" -> "phase 2", "phase i" -> "phase 1")
    const normTarget = target.replace(/phase\s*ii\b/g, 'phase 2').replace(/phase\s*i\b/g, 'phase 1').replace(/[^a-z0-9]/g, '');
    const normCandidate = candidate.replace(/phase\s*ii\b/g, 'phase 2').replace(/phase\s*i\b/g, 'phase 1').replace(/[^a-z0-9]/g, '');
    
    return normCandidate.includes(normTarget) || normTarget.includes(normCandidate);
  };

  // Dynamically constructed, deduplicated market options for the dropdown
  const marketOptions = useMemo(() => {
    const khargharMarkets = new Set<string>();
    const talojaMarkets = new Set<string>();
    const otherMarkets = new Set<string>();

    projects.forEach((p) => {
      const m = p.microMarket?.trim();
      if (!m) return;
      const lower = m.toLowerCase();
      if (lower.includes('kharghar')) {
        khargharMarkets.add(m);
      } else if (lower.includes('taloja')) {
        talojaMarkets.add(m);
      } else {
        otherMarkets.add(m);
      }
    });

    const opts: CustomSelectOption[] = [
      { value: 'ALL', label: 'All Sectors & Micro-Markets' },
    ];

    if (talojaMarkets.size > 0) {
      opts.push({ value: 'Taloja Phase 1', label: 'All Taloja Phase 1', group: 'Taloja Metro Corridor' });
      opts.push({ value: 'Taloja Phase 2', label: 'All Taloja Phase 2', group: 'Taloja Metro Corridor' });
      Array.from(talojaMarkets).sort().forEach((m) => {
        opts.push({ value: m, label: m, group: 'Taloja Specific Sectors' });
      });
    }

    if (khargharMarkets.size > 0) {
      opts.push({ value: 'Kharghar', label: 'All Kharghar Sectors', group: 'Kharghar Node' });
      Array.from(khargharMarkets).sort().forEach((m) => {
        opts.push({ value: m, label: m, group: 'Kharghar Specific Sectors' });
      });
    }

    if (otherMarkets.size > 0) {
      Array.from(otherMarkets).sort().forEach((m) => {
        opts.push({ value: m, label: m, group: 'Other Navi Mumbai' });
      });
    }

    return opts;
  }, [projects]);

  // Filtered Projects for Project Catalogue
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // 1. Market Filter
      const marketMatches = matchesMarketHelper(p.microMarket, p.subLocality);
      if (!marketMatches) return false;

      // 2. Status Filter
      if (selectedStatus === 'ACTIVE_MARKETABLE' && p.activeUnitCount === 0 && (p.unitCount || 0) > 0) {
        return false;
      }
      if (selectedStatus === 'STALE_EXPIRED' && p.activeUnitCount > 0) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (p.projectName || '').toLowerCase().includes(q);
        const matchesDev = (p.developerName || '').toLowerCase().includes(q);
        const matchesRera = (p.reraNumber || '').toLowerCase().includes(q);
        const matchesLoc = (p.microMarket || '').toLowerCase().includes(q) || (p.subLocality || '').toLowerCase().includes(q);
        const matchesDesc = (p.shortDescription || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
        const matchesPoc = (p.developerSalesPocName || '').toLowerCase().includes(q) || (p.developerSalesPocPhone || '').includes(q);
        const matchesHighlights = (p.keyHighlights || []).some((h: string) => h.toLowerCase().includes(q));
        
        if (!matchesName && !matchesDev && !matchesRera && !matchesLoc && !matchesDesc && !matchesPoc && !matchesHighlights) {
          return false;
        }
      }

      return true;
    });
  }, [projects, selectedMarket, selectedStatus, searchQuery]);

  // Filtered Units for Table & Cards
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const matchesMarket = matchesMarketHelper(u.project?.microMarket, u.project?.subLocality);
      const matchesBhk = selectedBhk === 'ALL' || String(u.bhk) === selectedBhk;
      const matchesStatus = selectedStatus === 'ALL' || u.freshness?.effectiveMarketableStatus === selectedStatus;
      
      if (!matchesMarket || !matchesBhk || !matchesStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesProjectName = (u.project?.projectName || '').toLowerCase().includes(q);
        const matchesDeveloper = (u.project?.developerName || '').toLowerCase().includes(q);
        const matchesRera = (u.project?.reraNumber || '').toLowerCase().includes(q);
        const matchesUnit = (u.unitNumber || '').toLowerCase().includes(q);
        const matchesMarketName = (u.project?.microMarket || '').toLowerCase().includes(q) || (u.project?.subLocality || '').toLowerCase().includes(q);
        const matchesDesc = (u.description || '').toLowerCase().includes(q);

        if (!matchesProjectName && !matchesDeveloper && !matchesRera && !matchesUnit && !matchesMarketName && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [units, selectedMarket, selectedBhk, selectedStatus, searchQuery]);

  // Check duplicate RERA registration in Add/Edit Project Modal
  const duplicateProjectInModal = useMemo(() => {
    const rawRera = (projectForm.reraNumber || '').trim().toUpperCase();
    if (!rawRera || rawRera.length < 8) return null;
    return projects.find((p) => {
      if (editingProjectId && p.id === editingProjectId) return false;
      const targetRera = (p.reraNumber || '').trim().toUpperCase();
      return targetRera === rawRera || targetRera.includes(rawRera) || rawRera.includes(targetRera);
    });
  }, [projectForm.reraNumber, projects, editingProjectId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-content font-sans">
      {/* Toast Notification Banner */}
      {bannerToast && (
        <div 
          role="status"
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-sm transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
            bannerToast.type === 'success' 
              ? 'bg-status-success-surface border-status-success/30 text-status-success' 
              : bannerToast.type === 'warning'
              ? 'bg-status-warning-surface border-status-warning/40 text-status-warning'
              : 'bg-accent-soft border-accent/30 text-accent-text'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {bannerToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
            ) : bannerToast.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-status-warning shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-accent shrink-0" />
            )}
            <span>{bannerToast.text}</span>
          </div>
          <button 
            type="button"
            onClick={() => setBannerToast(null)} 
            aria-label="Dismiss notification"
            className="p-1 hover:opacity-75 rounded-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 p-6 rounded-2xl bg-surface border border-border shadow-xs">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" /> MahaRERA Verified
            </span>
            <HallmarkStamp type="audit" label="14-day freshness rule" />
            <span className="text-[11px] font-mono text-content-muted hidden sm:inline-block">•</span>
            <span className="text-[11px] font-medium text-content-muted hidden sm:inline-block">
              {projects.length} Projects • {units.length} Units Active
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-content font-display">
            Projects &amp; Unit Inventory
          </h1>
          <p className="text-content-secondary text-xs max-w-2xl">
            Live verified project catalogue, unit-level pricing with statutory taxes, and 14-day freshness audit tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Utility Group: View Toggle + Refresh */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-subtle border border-border h-9">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Show inventory table"
              aria-pressed={viewMode === 'table'}
              className={`h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-xs transition-all ${viewMode === 'table' ? 'bg-accent text-white font-bold shadow-xs' : 'text-content-secondary hover:text-content font-medium'}`}
              title="Dense Table View"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              aria-label="Show inventory cards"
              aria-pressed={viewMode === 'cards'}
              className={`h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-xs transition-all ${viewMode === 'cards' ? 'bg-accent text-white font-bold shadow-xs' : 'text-content-secondary hover:text-content font-medium'}`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Cards</span>
            </button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button
              type="button"
              onClick={fetchInventory}
              disabled={loading}
              aria-label="Refresh inventory"
              className="h-7 w-7 grid place-items-center rounded-lg text-content-secondary hover:text-content transition-all"
              title="Refresh Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-accent' : ''}`} />
            </button>
          </div>

          {/* Secondary Tools Group */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowQuickReraModal(true)}
              className="h-9 px-3 rounded-xl bg-surface hover:bg-surface-subtle text-accent-text border border-border hover:border-accent/40 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
              title="Instant MahaRERA Registration & District Verifier"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>Verify RERA</span>
            </button>
            <button
              type="button"
              onClick={() => setShowBrochureModal(true)}
              className="h-9 px-3 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border hover:border-accent/40 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
              title="Upload Developer Brochure (PDF) with AI auto-extraction"
            >
              <Upload className="w-3.5 h-3.5 text-accent" />
              <span className="hidden sm:inline">Brochure AI</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCsvImportModal(true)}
              className="h-9 px-2.5 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border hover:border-border-hover text-xs font-medium transition-all flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
              title="Import CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-accent" />
              <span className="hidden md:inline">CSV</span>
            </button>
          </div>

          <div className="w-px h-6 bg-border mx-0.5 hidden lg:block" />

          {/* Single Contextual Primary Action Button */}
          <div className="flex items-center gap-2">
            {inventoryTab === 'projects' ? (
              <button
                type="button"
                onClick={openNewProject}
                className="h-9 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs hover:shadow-sm cursor-pointer shrink-0 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Project</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openNewUnit()}
                className="h-9 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs hover:shadow-sm cursor-pointer shrink-0 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Unit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {requestError && (
        <div role="alert" className="rounded-xl border border-status-danger/40 bg-status-danger-surface p-3.5 text-xs text-status-danger font-semibold shadow-xs">
          <p>{requestError}</p>
          <button type="button" onClick={fetchInventory} className="mt-1 font-bold text-status-danger underline underline-offset-2">Retry inventory</button>
        </div>
      )}

      {/* Section View Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-surface-subtle border border-border rounded-xl w-fit text-xs font-bold shadow-2xs">
          <button
            type="button"
            onClick={() => setInventoryTab('units')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              inventoryTab === 'units' ? 'bg-accent text-white shadow-2xs font-bold' : 'text-content-muted hover:text-content'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Marketable Units Matrix ({filteredUnits.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setInventoryTab('projects')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              inventoryTab === 'projects' ? 'bg-accent text-white shadow-2xs font-bold' : 'text-content-muted hover:text-content'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Project Catalogue ({filteredProjects.length})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
        <div className="relative flex-1 min-w-[240px] flex items-center">
          <Search className="w-4 h-4 text-content-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="inventory-search" className="sr-only">Search inventory records</label>
          <input
            id="inventory-search"
            name="inventorySearch"
            type="text"
            placeholder="Search by project, unit number, RERA ID, or micro-market…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input w-full bg-surface-inset border border-border rounded-xl pl-9 pr-12 py-2.5 text-xs text-content placeholder:text-content-muted focus:outline-none focus:border-accent shadow-2xs"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-content-muted bg-surface border border-border rounded-md absolute right-3 top-1/2 -translate-y-1/2 shadow-2xs pointer-events-none">
            ⌘K
          </kbd>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <CustomSelect
            options={marketOptions}
            value={selectedMarket}
            onChange={(val) => setSelectedMarket(val)}
            className="min-w-[220px]"
          />

          <CustomSelect
            options={[
              { value: 'ALL', label: 'All Configurations' },
              { value: '1', label: '1 BHK' },
              { value: '2', label: '2 BHK' },
              { value: '3', label: '3 BHK' },
            ]}
            value={selectedBhk}
            onChange={(val) => setSelectedBhk(val)}
            className="min-w-[150px]"
          />

          <CustomSelect
            options={[
              { value: 'ALL', label: 'All Audit Statuses' },
              { value: 'ACTIVE_MARKETABLE', label: 'Active Marketable (<14d)', dotColor: 'bg-emerald-500', description: 'Fresh & ready to pitch' },
              { value: 'STALE_EXPIRED', label: 'Stale Expired (>14d)', dotColor: 'bg-rose-500', description: 'Requires physical audit' },
            ]}
            value={selectedStatus}
            onChange={(val) => setSelectedStatus(val)}
            className="min-w-[190px]"
          />
        </div>
      </div>

      {inventoryTab === 'projects' && (
      <section aria-labelledby="project-catalogue-title" className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <h2 id="project-catalogue-title" className="font-display text-sm font-bold uppercase tracking-wider text-content">Project Catalogue</h2>
            <p className="mt-0.5 text-xs text-content-secondary">Maintain the story, location context, media, and RERA profile clients will see.</p>
          </div>
          <span className="font-mono text-xs font-bold text-accent-text">
            {filteredProjects.length} {filteredProjects.length === projects.length ? 'projects' : `of ${projects.length} projects`}
          </span>
        </div>
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => {
              const cover = project.coverImageUrl || project.mediaGallery?.find((asset: MediaAsset) => asset.kind === 'image')?.url;
              return (
                <article key={project.id} className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface shadow-xs hover:shadow-md hover:border-accent/40 transition-all duration-300">
                  <div>
                    {/* Card Hero Image Header */}
                    <div className="relative h-44 w-full bg-surface-subtle overflow-hidden">
                      {cover ? (
                        <img
                          src={cover}
                          alt={project.projectName}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                            const fallback = (e.target as HTMLElement).nextElementSibling;
                            if (fallback) (fallback as HTMLElement).classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      
                      {/* Fallback pattern when no image or image fails */}
                      <div className={`h-full w-full bg-gradient-to-br from-surface via-surface-subtle to-accent-soft/30 flex flex-col items-center justify-center p-4 text-center ${cover ? 'hidden' : 'flex'}`}>
                        <div className="w-12 h-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mb-2 shadow-2xs">
                          <Building2 className="h-6 w-6 text-accent" />
                        </div>
                        <span className="font-display font-bold text-xs text-content truncate max-w-[200px]">{project.projectName}</span>
                        <span className="text-[10px] text-content-muted">{project.microMarket}</span>
                      </div>

                      {/* Dark/Gradient Scrim Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 pointer-events-none" />

                      {/* Top Overlay Badge Bar */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-auto">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-white text-[10px] font-mono font-bold tracking-tight shadow-xs">
                            <ShieldCheck className="w-3 h-3 text-status-success" />
                            <span className="truncate max-w-[120px]">{project.reraNumber || 'RERA VERIFIED'}</span>
                          </span>
                          {project.hasOccupancyCertificate && (
                            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-status-success/80 backdrop-blur-md text-white text-[9px] font-bold tracking-wider uppercase shadow-xs">
                              OC Ready
                            </span>
                          )}
                        </div>

                        {/* Quick Menu Icons on Card Header */}
                        <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md p-1 rounded-xl border border-white/15 shadow-xs">
                          <button
                            type="button"
                            onClick={() => setMediaStudioProject(project)}
                            aria-label={`Open Elevation & Floor Plan Studio for ${project.projectName}`}
                            title="Elevation & Floor Plan Studio (Brochure Extractor & Cloud Storage)"
                            className="grid h-6 w-6 place-items-center rounded-lg text-amber-300 hover:text-white hover:bg-amber-500/30 transition-colors cursor-pointer"
                          >
                            <Sparkles className="h-3 w-3" />
                          </button>
                          {project.reraCertificateUrl && (
                            <button
                              type="button"
                              onClick={() => setFormCModalProject(project)}
                              aria-label={`View ${project.projectName} MahaRERA Form C Certificate`}
                              title="View Official MahaRERA Form 'C' Certificate"
                              className="grid h-6 w-6 place-items-center rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-500/30 transition-colors cursor-pointer"
                            >
                              <FileCheck className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setInspectProject(project)}
                            aria-label={`Inspect ${project.projectName} Specifications`}
                            title="Inspect Full Building & RERA Specs"
                            className="grid h-6 w-6 place-items-center rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditProject(project)}
                            aria-label={`Edit ${project.projectName}`}
                            title="Edit Project"
                            className="grid h-6 w-6 place-items-center rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmProject({ id: project.id, name: project.projectName, unitCount: project.unitCount || 0 })}
                            aria-label={`Delete ${project.projectName}`}
                            title="Delete Project"
                            className="grid h-6 w-6 place-items-center rounded-lg text-white/80 hover:text-status-danger hover:bg-red-500/20 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Overlay on Image: Location & Developer */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 pointer-events-none">
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/90 bg-white/15 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 mb-1">
                            <MapPin className="w-2.5 h-2.5 text-accent-soft" />
                            <span className="truncate max-w-[180px]">{project.microMarket}</span>
                          </span>
                          <h3 className="truncate font-display text-base font-bold text-white drop-shadow-xs">
                            {project.projectName}
                          </h3>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-[10px] font-mono font-bold text-white/90 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 block">
                            {project.unitCount || 0} units ({project.activeUnitCount || 0} live)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Body Specs & Highlights */}
                    <div className="p-4 space-y-3">
                      {/* Developer, Rate & Sublocality Row */}
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold text-content flex items-center gap-1 truncate">
                          <Building2 className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="truncate">{project.developerName}</span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {project.basePricePerSqft ? (
                            <span className="text-[11px] font-mono text-accent-text font-bold bg-accent-soft/70 px-2 py-0.5 rounded-md border border-accent/20">
                              ₹{project.basePricePerSqft.toLocaleString('en-IN')}/sq.ft
                            </span>
                          ) : null}
                          {project.distanceToMetroKm ? (
                            <span className="text-[11px] font-mono text-content-secondary font-medium bg-surface-subtle px-1.5 py-0.5 rounded-md border border-border">
                              {project.distanceToMetroKm} km to Metro
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="line-clamp-2 text-xs text-content-secondary leading-relaxed min-h-[32px]">
                        {project.shortDescription || project.description || 'Verified residential project in prime sector with standard developer amenities.'}
                      </p>

                      {/* Key Highlights Tags */}
                      {project.keyHighlights && project.keyHighlights.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {project.keyHighlights.slice(0, 2).map((hl: string, idx: number) => (
                            <span key={idx} className="inline-flex items-center gap-1 text-[10px] font-medium text-accent-text bg-accent-soft/80 border border-accent/20 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                              <Star className="w-2.5 h-2.5 text-accent shrink-0" />
                              <span className="truncate">{hl}</span>
                            </span>
                          ))}
                          {project.keyHighlights.length > 2 && (
                            <span className="text-[10px] font-mono font-semibold text-content-muted px-1.5 py-0.5">
                              +{project.keyHighlights.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Card Bottom CTA Actions */}
                  <div className="px-4 pb-4 pt-2 border-t border-border flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectProject(project)}
                      className="flex-1 h-8 rounded-xl bg-surface-subtle hover:bg-accent-soft text-content hover:text-accent-text border border-border hover:border-accent/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      title="View full specs, amenities, brochure and map"
                    >
                      <Eye className="w-3.5 h-3.5 text-accent" />
                      <span>View Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openNewUnit(project.id)}
                      className="h-8 px-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      title="Add unit under this project"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Unit</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-surface rounded-2xl border border-border space-y-2">
            <Building2 className="w-8 h-8 mx-auto text-content-muted/40" />
            <p className="text-xs font-bold text-content">No projects match the current search &amp; filter criteria</p>
            <p className="text-[11px] text-content-muted">Try adjusting your search query or micro-market filter.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedMarket('ALL');
                setSelectedBhk('ALL');
                setSelectedStatus('ALL');
              }}
              className="mt-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-accent text-white hover:bg-accent-hover cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>
      )}

      {/* UNITS MATRIX SECTION (TABLE OR CARD VIEW) */}
      {inventoryTab === 'units' && (
        <section aria-labelledby="marketable-units-title" className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <h2 id="marketable-units-title" className="font-display text-sm font-bold uppercase tracking-wider text-content">Marketable Units Matrix</h2>
              <p className="mt-0.5 text-xs text-content-secondary">Individual floor plate flats, statutory tax schedules, and 14-day broker verification status.</p>
            </div>
            <span className="font-mono text-xs font-bold text-accent-text">
              {filteredUnits.length} {filteredUnits.length === units.length ? 'units' : `of ${units.length} units`}
            </span>
          </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="rounded-2xl bg-surface border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle text-content-secondary uppercase text-[10px] font-bold border-b border-border">
                <tr>
                  <th className="p-3.5 pl-4">Project &amp; Developer</th>
                  <th className="p-3.5">Unit / Floor</th>
                  <th className="p-3.5">Config &amp; Carpet</th>
                  <th className="p-3.5 text-right">Agreement Value</th>
                  <th className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1" title="All-Inclusive Total Cost including Stamp Duty, Registration, GST and Society charges">
                      <span>All-In Cost</span>
                      <span className="text-[9px] font-mono text-content-muted font-normal lowercase">(all taxes incl.)</span>
                    </div>
                  </th>
                  <th className="p-3.5">RERA ID</th>
                  <th className="p-3.5 text-center">Broker Update</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-content-secondary">
                {filteredUnits.map((unit) => {
                  const isFresh = unit.freshness?.effectiveMarketableStatus === 'ACTIVE_MARKETABLE';
                  const isStale = unit.freshness?.effectiveMarketableStatus === 'STALE_EXPIRED';
                  const daysAgo = unit.freshness?.daysSinceVerification ?? 0;

                  return (
                    <tr key={unit.id} className={`hover:bg-surface-subtle/80 transition-colors ${isStale ? 'bg-status-danger-surface/30' : ''}`}>
                      <td className="p-3.5 pl-4">
                        <div className="font-bold text-content font-sans text-sm">{unit.project?.projectName}</div>
                        <div className="text-[11px] text-content-muted mt-0.5">{unit.project?.developerName} • {unit.project?.microMarket}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-content">Unit {unit.unitNumber || 'N/A'}</div>
                        <div className="text-[11px] text-content-muted mt-0.5">Floor {unit.floorNumber} of {unit.totalFloors}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="text-accent-text font-bold">{unit.bhk} BHK • {unit.facing}</div>
                        <div className="text-[11px] text-content-muted mt-0.5 font-mono">{unit.carpetAreaSqft} sq.ft carpet</div>
                      </td>

                      <td className="p-3.5 text-right font-bold text-content font-mono">
                        {formatINR(unit.agreementValue)}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="font-bold text-accent-text font-mono">{formatINR(unit.allInTotalCost)}</div>
                        <button
                          onClick={() => setCalcModalUnit(unit)}
                          className="text-[11px] text-content-muted hover:text-accent underline cursor-pointer"
                        >
                          View Breakdown
                        </button>
                      </td>

                      <td className="p-3.5">
                        <HallmarkStamp
                          type="rera"
                          code={unit.project?.reraNumber}
                          label="Format checked"
                          size="sm"
                        />
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                          isFresh
                            ? 'bg-status-success-surface text-status-success border-status-success/30'
                            : 'bg-status-danger-surface text-status-danger border-status-danger/30 animate-pulse'
                        }`}>
                          {isFresh ? `Updated ${daysAgo}d ago` : `Stale: ${daysAgo}d old`}
                        </span>
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectProject(unit.project)}
                            aria-label={`Inspect ${unit.project?.projectName} specifications`}
                            title="Inspect Full Building &amp; RERA Specs"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-content-secondary hover:text-accent hover:border-accent/40 shadow-2xs transition-all"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditUnit(unit)}
                            aria-label={`Edit unit ${unit.unitNumber || 'record'}`}
                            title="Edit unit"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-content-secondary hover:text-content shadow-2xs transition-all cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmUnit({ id: unit.id, unitNumber: unit.unitNumber || 'Unit', projectName: unit.project?.projectName || 'Project' })}
                            aria-label={`Delete unit ${unit.unitNumber || 'record'}`}
                            title="Delete property unit"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-content-secondary hover:text-status-danger hover:border-status-danger/30 hover:bg-status-danger-surface shadow-2xs transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setVerifyModalUnit(unit);
                              setTargetStatus(unit.verificationStatus);
                              setAuditNotes(unit.verificationNotes || '');
                            }}
                            className="rounded-xl bg-surface hover:bg-surface-subtle px-3 py-1.5 text-xs font-bold text-accent-text border border-border hover:border-accent/40 shadow-2xs transition-all cursor-pointer"
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
                    <td colSpan={8} className="p-8 text-center text-content-muted text-xs">
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
        filteredUnits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredUnits.map((unit) => {
              return (
                <div key={unit.id} className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3 font-sans text-xs hover:border-accent/40 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-content text-base font-display">{unit.project?.projectName}</h3>
                      <p className="text-xs text-content-muted mt-0.5">Unit {unit.unitNumber} ({unit.bhk} BHK • {unit.carpetAreaSqft} sqft)</p>
                    </div>
                    <HallmarkStamp type="rera" code={unit.project?.reraNumber} size="sm" />
                  </div>
                  <div className="pt-3 border-t border-border flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-content-muted uppercase font-semibold block">Total All-In Cost</span>
                      <strong className="text-content text-sm font-bold font-mono">{formatINR(unit.allInTotalCost)}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditUnit(unit)}
                        aria-label={`Edit unit ${unit.unitNumber || 'record'}`}
                        title="Edit unit"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-content-secondary hover:text-content shadow-2xs transition-all cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmUnit({ id: unit.id, unitNumber: unit.unitNumber || 'Unit', projectName: unit.project?.projectName || 'Project' })}
                        aria-label={`Delete unit ${unit.unitNumber || 'record'}`}
                        title="Delete property unit"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-content-secondary hover:text-status-danger hover:border-status-danger/30 hover:bg-status-danger-surface shadow-2xs transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVerifyModalUnit(unit);
                          setTargetStatus(unit.verificationStatus);
                          setAuditNotes(unit.verificationNotes || '');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle text-accent-text border border-border hover:border-accent/40 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                      >
                        Record Update
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-surface rounded-2xl border border-border text-content-muted text-xs">
            No property units match the current criteria.
          </div>
        )
      )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD DEVELOPER PROJECT                                            */}
      {/* ========================================================================= */}
      <AccessibleDialog
        open={showAddProjectModal}
        onClose={() => setShowAddProjectModal(false)}
        titleId="add-project-title"
        descriptionId="add-project-description"
        size="xl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-accent" />
            <div>
              <h2 id="add-project-title" className="font-bold text-content text-base font-display">
                {editingProjectId ? 'Edit Developer Project' : 'Add Developer Project & RERA Profile'}
              </h2>
              <p id="add-project-description" className="mt-1 text-xs text-content-muted">
                Shape the project story, media, location context, and commercial record used in client proposals.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-dialog-close
            aria-label="Close project form"
            onClick={() => { setShowAddProjectModal(false); setEditingProjectId(null); }}
            className="p-1 rounded-lg text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {actionError && (
          <div role="alert" className="rounded-xl border border-status-danger/40 bg-status-danger-surface p-3 text-xs text-status-danger font-medium mt-3">
            {actionError}
          </div>
        )}

        <form onSubmit={handleCreateProject} className="space-y-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-content block mb-1">Developer / Builder Name *</label>
              <input
                type="text"
                aria-label="Developer or builder name"
                data-dialog-autofocus
                required
                placeholder="e.g. Crown Lifespaces"
                value={projectForm.developerName}
                onChange={(e) => setProjectForm({ ...projectForm, developerName: e.target.value })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">Project Name *</label>
              <input
                type="text"
                aria-label="Project name"
                required
                placeholder="e.g. Crown Heights Luxury"
                value={projectForm.projectName}
                onChange={(e) => setProjectForm({ ...projectForm, projectName: e.target.value })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-surface-subtle/50 p-4">
            <div>
              <label className="text-xs font-bold text-content block mb-1">Client-facing one-line summary</label>
              <input
                aria-label="Project short description"
                type="text"
                maxLength={240}
                placeholder="A calm, design-led address with valley-facing residences"
                value={projectForm.shortDescription}
                onChange={(e) => setProjectForm({ ...projectForm, shortDescription: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">Project description</label>
              <textarea
                aria-label="Project description"
                rows={3}
                maxLength={4000}
                placeholder="Describe the design intent, living experience, delivery context, and what makes the project relevant to this client."
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">Location story</label>
              <textarea
                aria-label="Project location description"
                rows={2}
                maxLength={1000}
                placeholder="Explain access, nearby transit, schools, retail, and the micro-market in human terms."
                value={projectForm.locationDescription}
                onChange={(e) => setProjectForm({ ...projectForm, locationDescription: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-content block mb-1">
                  Key highlights <span className="text-content-muted font-normal">(one per line)</span>
                </label>
                <textarea
                  aria-label="Project key highlights"
                  rows={3}
                  placeholder="Valley-facing balconies&#10;Low-density two-tower plan&#10;Walkable metro access"
                  value={projectForm.keyHighlights.join('\n')}
                  onChange={(e) => setProjectForm({ ...projectForm, keyHighlights: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })}
                  className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-content block mb-1">
                  Amenities <span className="text-content-muted font-normal">(one per line)</span>
                </label>
                <textarea
                  aria-label="Project amenities"
                  rows={3}
                  placeholder="Clubhouse&#10;Swimming pool&#10;Fitness studio"
                  value={projectForm.amenities.join('\n')}
                  onChange={(e) => setProjectForm({ ...projectForm, amenities: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })}
                  className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">
                Cover image URL <span className="text-content-muted font-normal">(optional)</span>
              </label>
              <input
                aria-label="Project cover image URL"
                type="url"
                placeholder="https://…"
                value={projectForm.coverImageUrl}
                onChange={(e) => setProjectForm({ ...projectForm, coverImageUrl: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
            <MediaUploader value={projectForm.mediaGallery} onChange={(mediaGallery) => setProjectForm({ ...projectForm, mediaGallery })} label="Project gallery" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-content block mb-1">MahaRERA Registration Number *</label>
              <input
                type="text"
                aria-label="RERA registration number"
                required
                placeholder="e.g. P52000018920"
                value={projectForm.reraNumber}
                onChange={(e) => setProjectForm({ ...projectForm, reraNumber: e.target.value.toUpperCase() })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content font-mono font-bold focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">Micro-Market Locality *</label>
              <select
                aria-label="Micro-market locality"
                value={projectForm.microMarket}
                onChange={(e) => setProjectForm({ ...projectForm, microMarket: e.target.value })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
              >
                <option value="Kharghar Sector 35" className="bg-surface text-content">Kharghar Sector 35</option>
                <option value="Kharghar Sector 36" className="bg-surface text-content">Kharghar Sector 36</option>
                <option value="Kharghar Sector 20" className="bg-surface text-content">Kharghar Sector 20</option>
                <option value="Taloja Phase 1" className="bg-surface text-content">Taloja Phase 1</option>
                <option value="Upper Kharghar" className="bg-surface text-content">Upper Kharghar</option>
                <option value="Roadpali" className="bg-surface text-content">Roadpali</option>
              </select>
            </div>

            {/* Full-width RERA Verification Badge */}
            {projectForm.reraNumber && (
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <ReraVerificationBadge
                  reraNumber={projectForm.reraNumber}
                  projectId={editingProjectId || undefined}
                  showDuplicateCheck={true}
                  showPortalLink={true}
                  showCopyButton={true}
                />
                {duplicateProjectInModal && (
                  <div className="p-3 bg-status-warning-surface border border-status-warning/40 rounded-xl text-status-warning text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-status-warning mt-0.5" />
                    <div>
                      <span className="font-bold">Duplicate MahaRERA ID Detected: </span>
                      <span>
                        This registration is already recorded in CRM under <strong>{duplicateProjectInModal.projectName}</strong> ({duplicateProjectInModal.microMarket}). Submitting this form will update specifications and synchronize child units with the existing project record.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-content block mb-1">Distance to Metro (Km)</label>
              <input
                aria-label="Distance to metro in kilometres"
                type="number"
                step="0.05"
                value={projectForm.distanceToMetroKm}
                onChange={(e) => setProjectForm({ ...projectForm, distanceToMetroKm: Number(e.target.value) })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">Base Price / Sqft (₹)</label>
              <input
                aria-label="Base price per square foot"
                type="number"
                step="50"
                value={projectForm.basePricePerSqft}
                onChange={(e) => setProjectForm({ ...projectForm, basePricePerSqft: Number(e.target.value) })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">Std Commission %</label>
              <input
                aria-label="Standard commission percentage"
                type="number"
                step="0.1"
                value={projectForm.standardCommissionPercent}
                onChange={(e) => setProjectForm({ ...projectForm, standardCommissionPercent: Number(e.target.value) })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-content block mb-1">Developer Sales POC Name</label>
              <input
                aria-label="Developer sales point of contact name"
                type="text"
                placeholder="e.g. Vikram Joshi"
                value={projectForm.developerSalesPocName}
                onChange={(e) => setProjectForm({ ...projectForm, developerSalesPocName: e.target.value })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">Developer Sales POC Mobile</label>
              <input
                aria-label="Developer sales point of contact mobile"
                type="text"
                placeholder="+91 98190 01122"
                value={projectForm.developerSalesPocPhone}
                onChange={(e) => setProjectForm({ ...projectForm, developerSalesPocPhone: e.target.value })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted font-mono focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-subtle border border-border flex items-center justify-between">
            <div>
              <span className="text-content font-bold text-xs block">Occupancy Certificate (OC) Received</span>
              <span className="text-[11px] text-content-muted">If checked, buyers pay 0% statutory GST.</span>
            </div>
            <input
              aria-label="Occupancy certificate received"
              type="checkbox"
              checked={projectForm.hasOccupancyCertificate}
              onChange={(e) => setProjectForm({ ...projectForm, hasOccupancyCertificate: e.target.checked })}
              className="w-4 h-4 accent-accent cursor-pointer rounded"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={() => setShowAddProjectModal(false)}
              className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingProject}
              className={`px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                duplicateProjectInModal
                  ? 'bg-status-warning text-black hover:bg-status-warning/90'
                  : 'bg-accent hover:bg-accent-hover text-white'
              }`}
            >
              {creatingProject ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : duplicateProjectInModal ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Update &amp; Synchronize Existing Project</span>
                </>
              ) : editingProjectId ? (
                <span>Save project changes</span>
              ) : (
                <span>Register Project</span>
              )}
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
        size="xl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-accent" />
            <div>
              <h2 id="add-unit-title" className="font-bold text-content text-base font-display">
                {editingUnitId ? 'Edit Property Unit' : 'Add Property Unit'}
              </h2>
              <p id="add-unit-description" className="mt-1 text-xs text-content-muted">
                Capture the unit story, floor plan, media, and transparent commercial inputs for a client-ready presentation.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-dialog-close
            aria-label="Close unit form"
            onClick={() => { setShowAddModal(false); setEditingUnitId(null); }}
            className="p-1 rounded-lg text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {actionError && (
          <div role="alert" className="rounded-xl border border-status-danger/40 bg-status-danger-surface p-3 text-xs text-status-danger font-medium mt-3">
            {actionError}
          </div>
        )}

        <form onSubmit={handleCreateUnit} className="space-y-4 pt-3">
          <div>
            <label className="text-xs font-bold text-content block mb-1">Developer Project *</label>
            <select
              aria-label="Developer project"
              data-dialog-autofocus
              value={unitForm.projectId}
              onChange={(e) => setUnitForm({ ...unitForm, projectId: e.target.value })}
              className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-surface text-content">
                  {p.projectName} ({p.developerName} • {p.microMarket})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-content block mb-1">Unit Number</label>
              <input
                aria-label="Unit number"
                type="text"
                placeholder="e.g. A-1204"
                value={unitForm.unitNumber}
                onChange={(e) => setUnitForm({ ...unitForm, unitNumber: e.target.value })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">BHK Config</label>
              <select
                aria-label="BHK configuration"
                value={unitForm.bhk}
                onChange={(e) => setUnitForm({ ...unitForm, bhk: Number(e.target.value) })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content focus:outline-hidden focus:border-accent font-medium"
              >
                <option value="1" className="bg-surface text-content">1 BHK</option>
                <option value="2" className="bg-surface text-content">2 BHK</option>
                <option value="3" className="bg-surface text-content">3 BHK</option>
                <option value="4" className="bg-surface text-content">4 BHK</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">Carpet Area (Sq.Ft) *</label>
              <input
                aria-label="Carpet area in square feet"
                type="number"
                required
                value={unitForm.carpetAreaSqft}
                onChange={(e) => setUnitForm({ ...unitForm, carpetAreaSqft: Number(e.target.value) })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-content block mb-1">Bathrooms</label>
              <input
                aria-label="Number of bathrooms"
                type="number"
                min={1}
                value={unitForm.bathrooms}
                onChange={(e) => setUnitForm({ ...unitForm, bathrooms: Number(e.target.value) })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">Balconies</label>
              <input
                aria-label="Number of balconies"
                type="number"
                min={0}
                value={unitForm.balconies}
                onChange={(e) => setUnitForm({ ...unitForm, balconies: Number(e.target.value) })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-content block mb-1">Floor Number</label>
              <input
                aria-label="Floor number"
                type="number"
                value={unitForm.floorNumber}
                onChange={(e) => setUnitForm({ ...unitForm, floorNumber: Number(e.target.value) })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">Total Floors</label>
              <input
                aria-label="Total floors"
                type="number"
                value={unitForm.totalFloors}
                onChange={(e) => setUnitForm({ ...unitForm, totalFloors: Number(e.target.value) })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">Facing</label>
              <select
                aria-label="Unit facing"
                value={unitForm.facing}
                onChange={(e) => setUnitForm({ ...unitForm, facing: e.target.value })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content focus:outline-hidden focus:border-accent font-medium"
              >
                <option value="EAST" className="bg-surface text-content">EAST</option>
                <option value="WEST" className="bg-surface text-content">WEST</option>
                <option value="NORTH" className="bg-surface text-content">NORTH</option>
                <option value="SOUTH" className="bg-surface text-content">SOUTH</option>
                <option value="NORTH_EAST" className="bg-surface text-content">NORTH_EAST</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-content block mb-1">Agreement Base Value (₹) *</label>
              <input
                aria-label="Agreement base value"
                type="number"
                required
                step="10000"
                value={unitForm.agreementValue}
                onChange={(e) => setUnitForm({ ...unitForm, agreementValue: Number(e.target.value) })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content font-mono font-bold focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">Possession Status</label>
              <select
                aria-label="Possession status"
                value={unitForm.possessionStatus}
                onChange={(e) => setUnitForm({ ...unitForm, possessionStatus: e.target.value })}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content focus:outline-hidden focus:border-accent font-medium"
              >
                <option value="READY_TO_MOVE" className="bg-surface text-content">READY_TO_MOVE (0% GST with OC)</option>
                <option value="UNDER_CONSTRUCTION" className="bg-surface text-content">UNDER_CONSTRUCTION (5% GST)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-surface-subtle/50 p-4">
            <div>
              <label className="text-xs font-bold text-content block mb-1">Client-facing unit description</label>
              <textarea
                aria-label="Unit description"
                rows={3}
                maxLength={4000}
                placeholder="Describe the light, outlook, layout, finishes, and the kind of buyer this home suits."
                value={unitForm.description}
                onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">
                Feature highlights <span className="text-content-muted font-normal">(one per line)</span>
              </label>
              <textarea
                aria-label="Unit feature highlights"
                rows={2}
                placeholder="Corner living room&#10;Morning light&#10;Two covered parking bays"
                value={unitForm.featureHighlights.join('\n')}
                onChange={(e) => setUnitForm({ ...unitForm, featureHighlights: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })}
                className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">
                Floor plan URL <span className="text-content-muted font-normal">(optional)</span>
              </label>
              <input
                aria-label="Floor plan URL"
                type="url"
                placeholder="https://…"
                value={unitForm.floorPlanUrl}
                onChange={(e) => setUnitForm({ ...unitForm, floorPlanUrl: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-content block mb-1">
                External walkthrough URL <span className="text-content-muted font-normal">(optional)</span>
              </label>
              <input
                aria-label="External walkthrough URL"
                type="url"
                placeholder="YouTube, Vimeo, or builder walkthrough link"
                value={unitForm.videoReelUrl}
                onChange={(e) => setUnitForm({ ...unitForm, videoReelUrl: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium"
              />
            </div>
            <MediaUploader value={unitForm.mediaGallery} onChange={(mediaGallery) => setUnitForm({ ...unitForm, mediaGallery, photoUrls: mediaGallery.filter((asset) => asset.kind === 'image').map((asset) => asset.url) })} label="Unit gallery and walkthrough" />
          </div>

          <div>
            <label className="text-xs font-bold text-content block mb-1">Audit Log / Inspection Verification Notes</label>
            <textarea
              aria-label="Audit log and inspection verification notes"
              rows={2}
              value={unitForm.verificationNotes}
              onChange={(e) => setUnitForm({ ...unitForm, verificationNotes: e.target.value })}
              className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingUnit}
              className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
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
        size="md"
      >
        {verifyModalUnit && (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 id="verify-unit-title" className="font-bold text-content text-base font-display flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  Inventory Update Record
                </h2>
                <p id="verify-unit-description" className="mt-1 text-xs text-content-muted">
                  Record the source and status used for the freshness date.
                </p>
              </div>
              <button
                type="button"
                data-dialog-close
                aria-label="Close inventory update"
                onClick={() => setVerifyModalUnit(null)}
                className="p-1 rounded-lg text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {auditSuccessMsg ? (
              <div className="p-4 rounded-xl bg-status-success-surface border border-status-success/40 text-status-success font-medium text-xs text-center my-3">
                ✓ {auditSuccessMsg}
              </div>
            ) : (
              <>
                {actionError && (
                  <div role="alert" className="rounded-xl border border-status-danger/40 bg-status-danger-surface p-3 text-xs text-status-danger font-medium mt-3">
                    {actionError}
                  </div>
                )}
                <form onSubmit={handleVerifyUnit} className="space-y-4 pt-3">
                  <div className="p-3 rounded-xl bg-surface-subtle border border-border">
                    <span className="text-content-muted text-[11px] block">Target Unit:</span>
                    <strong className="text-content text-xs font-bold">
                      {verifyModalUnit.project?.projectName} - Unit {verifyModalUnit.unitNumber} ({verifyModalUnit.bhk} BHK)
                    </strong>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-content block mb-1">Target Verification Status:</label>
                    <select
                      aria-label="Target verification status"
                      data-dialog-autofocus
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value)}
                      className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
                    >
                      <option value="ACTIVE_MARKETABLE" className="bg-surface text-content">ACTIVE_MARKETABLE (broker update &lt;14d)</option>
                      <option value="PHYSICALLY_AUDITED" className="bg-surface text-content">PHYSICALLY_AUDITED (internal status)</option>
                      <option value="STALE_EXPIRED" className="bg-surface text-content">STALE_EXPIRED</option>
                      <option value="ARCHIVED_SOLD" className="bg-surface text-content">ARCHIVED_SOLD</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-content block mb-1">Mandatory Update Notes:</label>
                    <textarea
                      aria-label="Mandatory update notes"
                      rows={3}
                      value={auditNotes}
                      onChange={(e) => setAuditNotes(e.target.value)}
                      placeholder="Record the source, price check, availability update, or site review…"
                      className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
                      required
                    />
                  </div>

                  <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setVerifyModalUnit(null)}
                      className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingAudit}
                      className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      {submittingAudit ? 'Recording…' : 'Record Update'}
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
        size="lg"
      >
        {calcModalUnit && (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 id="cost-sheet-title" className="font-bold text-content text-base font-display">
                  Statutory All-in Cost Sheet
                </h2>
                <p id="cost-sheet-description" className="text-xs text-content-muted">
                  {calcModalUnit.project?.projectName} • Unit {calcModalUnit.unitNumber}
                </p>
              </div>
              <button
                type="button"
                data-dialog-close
                aria-label="Close cost sheet"
                onClick={() => setCalcModalUnit(null)}
                className="p-1 rounded-lg text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 divide-y divide-border text-xs text-content-muted pt-2">
              <div className="flex justify-between pt-2">
                <span>Agreement Base Value:</span>
                <strong className="text-content font-mono font-bold">{formatINR(calcModalUnit.agreementValue)}</strong>
              </div>
              <div className="flex justify-between pt-2">
                <span>Maharashtra Stamp Duty ({calcModalUnit.stampDutyRate}%):</span>
                <strong className="text-content font-mono font-bold">{formatINR(Math.round((calcModalUnit.agreementValue * calcModalUnit.stampDutyRate) / 100))}</strong>
              </div>
              <div className="flex justify-between pt-2">
                <span>Registration Fee (1% capped at ₹30k):</span>
                <strong className="text-content font-mono font-bold">{formatINR(calcModalUnit.registrationFee)}</strong>
              </div>
              <div className="flex justify-between pt-2">
                <span>GST ({calcModalUnit.gstRate}% {calcModalUnit.gstRate === 0 ? 'OC Received' : 'Under-Construction'}):</span>
                <strong className="text-content font-mono font-bold">{formatINR(Math.round((calcModalUnit.agreementValue * calcModalUnit.gstRate) / 100))}</strong>
              </div>
              <div className="flex justify-between pt-2">
                <span>Floor Rise Charges:</span>
                <strong className="text-content font-mono font-bold">{formatINR(calcModalUnit.floorRiseCharges)}</strong>
              </div>
              <div className="flex justify-between pt-2">
                <span>Covered Car Parking:</span>
                <strong className="text-content font-mono font-bold">{formatINR(calcModalUnit.parkingCharges)}</strong>
              </div>
              <div className="flex justify-between pt-2">
                <span>Society Development / Club Charges:</span>
                <strong className="text-content font-mono font-bold">{formatINR(calcModalUnit.societyDevelopmentCharges)}</strong>
              </div>
              <div className="flex justify-between pt-3 border-t border-border text-sm font-bold text-accent">
                <span>Total All-Inclusive Capitalized Cost:</span>
                <span className="font-mono">{formatINR(calcModalUnit.allInTotalCost)}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-end border-t border-border mt-3">
              <button
                type="button"
                data-dialog-autofocus
                onClick={() => setCalcModalUnit(null)}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                Close Cost Sheet
              </button>
            </div>
          </>
        )}
      </AccessibleDialog>

      {/* Project Specifications Inspector Modal */}
      {inspectProject && (
        <ProjectDetailsModal
          project={inspectProject}
          units={units}
          onClose={() => setInspectProject(null)}
          onSelectUnitForCalc={(unit) => setCalcModalUnit(unit)}
          onEditProject={(proj) => openEditProject(proj)}
          onDeleteProject={(id, name) => {
            setInspectProject(null);
            setDeleteConfirmProject({
              id,
              name,
              unitCount: units.filter((u) => u.projectId === id).length,
            });
          }}
        />
      )}

      {/* DELETE PROJECT CONFIRMATION MODAL */}
      {deleteConfirmProject && (
        <AccessibleDialog
          open={true}
          onClose={() => setDeleteConfirmProject(null)}
          titleId="delete-project-title"
          size="md"
        >
          <div className="space-y-4 text-content">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-status-danger-surface border border-status-danger/30 text-status-danger rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h2 id="delete-project-title" className="text-base font-bold text-content font-display">
                  Delete Developer Project?
                </h2>
                <p className="text-xs text-content-muted mt-0.5">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-status-danger-surface/50 border border-status-danger/20 rounded-xl text-xs text-content space-y-1.5">
              <p className="font-semibold text-status-danger">
                You are about to permanently delete <strong>{deleteConfirmProject.name}</strong>.
              </p>
              <p className="text-content-secondary text-[11px] leading-relaxed">
                This will delete the developer catalog entry and all <strong>{deleteConfirmProject.unitCount} associated child units</strong> from your active inventory, portals, and matchmaker.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                disabled={deletingProject}
                onClick={() => setDeleteConfirmProject(null)}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingProject}
                onClick={() => handleDeleteProject(deleteConfirmProject.id, deleteConfirmProject.name)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {deletingProject ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete Project</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </AccessibleDialog>
      )}

      {/* DELETE UNIT CONFIRMATION MODAL */}
      {deleteConfirmUnit && (
        <AccessibleDialog
          open={true}
          onClose={() => setDeleteConfirmUnit(null)}
          titleId="delete-unit-title"
          size="md"
        >
          <div className="space-y-4 text-content">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-status-danger-surface border border-status-danger/30 text-status-danger rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h2 id="delete-unit-title" className="text-base font-bold text-content font-display">
                  Delete Property Unit?
                </h2>
                <p className="text-xs text-content-muted mt-0.5">
                  Remove this specific unit flat from marketable inventory.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-surface-subtle border border-border rounded-xl text-xs text-content space-y-1">
              <p className="font-semibold text-content">
                Unit: <strong>{deleteConfirmUnit.unitNumber}</strong> ({deleteConfirmUnit.projectName})
              </p>
              <p className="text-content-muted text-[11px]">
                This unit will be removed from buyer matching, client presentation links, and financial calculators.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                disabled={deletingUnit}
                onClick={() => setDeleteConfirmUnit(null)}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingUnit}
                onClick={() => handleDeleteUnit(deleteConfirmUnit.id, deleteConfirmUnit.unitNumber)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {deletingUnit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Unit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </AccessibleDialog>
      )}

      {/* CSV Bulk Importer Modal */}
      {showCsvImportModal && (
        <CsvImportModal
          onClose={() => setShowCsvImportModal(false)}
          onImportSuccess={() => {
            setShowCsvImportModal(false);
            fetchInventory();
          }}
        />
      )}

      {/* Developer Brochure PDF Upload & AI Auto-Extractor Modal */}
      <BrochureUploadModal
        open={showBrochureModal}
        onClose={() => setShowBrochureModal(false)}
        onSuccess={(project) => {
          setShowBrochureModal(false);
          setBannerToast({
            text: `Project "${project.projectName}" and ${project.unitsCount || 0} unit configuration(s) saved & synchronized in CRM successfully!`,
            type: 'success',
          });
          fetchInventory();
          setTimeout(() => setBannerToast(null), 5000);
        }}
      />

      {/* Quick RERA Registration Verifier Modal */}
      <QuickReraLookupModal
        isOpen={showQuickReraModal}
        onClose={() => setShowQuickReraModal(false)}
      />

      {/* Form C Interactive Certificate Modal */}
      {formCModalProject && (
        <MahaReraCertificateModal
          open={!!formCModalProject}
          onClose={() => setFormCModalProject(null)}
          projectData={{
            reraNumber: formCModalProject.reraNumber || 'P52000079818',
            projectName: formCModalProject.projectName || 'CITY AVENUE',
            developerName: formCModalProject.developerName || 'City Space',
            promoterName: formCModalProject.promoterName || formCModalProject.developerName || 'City Space',
            address: formCModalProject.address || 'PLOT NO 12D, SECTOR-24 at Taloja Panchnad , Panvel, Raigarh, 410208',
            plotDetails: formCModalProject.plotDetails || formCModalProject.address || 'PLOT NO 12D, SECTOR-24 at Taloja Panchnad , Panvel, Raigarh, 410208',
            registeredOffice: formCModalProject.registeredOffice || 'Tehsil: Panvel, District: Raigarh, Pin: 410210',
            registrationDate: formCModalProject.registrationDate ? String(formCModalProject.registrationDate) : '27/03/2025',
            validUntil: formCModalProject.validUntil ? String(formCModalProject.validUntil) : (formCModalProject.reraValidUntil ? String(formCModalProject.reraValidUntil) : '31/12/2028'),
            signatoryName: formCModalProject.signatoryName || 'Prakash Kaluram Sabale',
            signatoryDate: formCModalProject.signatoryDate || '3/27/2025 3:57:36 PM',
            certificateUrl: formCModalProject.reraCertificateUrl || (formCModalProject.reraNumber === 'P52000079818' ? '/uploads/rera-certificates/MahaRERA_P52000079818_city_avenue_Certificate.pdf' : undefined),
            originalImageUrl: formCModalProject.originalDocumentUrl || (formCModalProject.reraNumber === 'P52000079818' ? '/images/original-certificates/P52000079818.png' : undefined),
            isOriginalScannedDocument: true,
          }}
        />
      )}

      {/* Elevation, Floor Plan & Media Studio Modal */}
      {mediaStudioProject && (
        <ProjectMediaStudioModal
          open={!!mediaStudioProject}
          onClose={() => setMediaStudioProject(null)}
          project={mediaStudioProject}
          onUpdated={() => {
            fetchInventory();
          }}
        />
      )}
    </div>
  );
}

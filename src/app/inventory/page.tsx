'use client';

import React, { useState, useEffect } from 'react';
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
  ChevronUp
} from 'lucide-react';

export default function InventoryPage() {
  const [units, setUnits] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState('ALL');
  const [selectedBhk, setSelectedBhk] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [verifyModalUnit, setVerifyModalUnit] = useState<any | null>(null);
  const [auditNotes, setAuditNotes] = useState('');
  const [targetStatus, setTargetStatus] = useState('ACTIVE_MARKETABLE');
  const [submittingAudit, setSubmittingAudit] = useState(false);
  const [auditSuccessMsg, setAuditSuccessMsg] = useState('');

  // Quick Calculator Preview Modal
  const [calcModalUnit, setCalcModalUnit] = useState<any | null>(null);

  // ----------------------------------------------------
  // Full-Featured Add Property Unit Form State
  // ----------------------------------------------------
  const [showAddModal, setShowAddModal] = useState(false);
  const [unitForm, setUnitForm] = useState({
    projectId: '',
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
    videoReelUrl: 'https://youtube.com/shorts/sample-reel',
    photoUrls: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
    ],
    newPhotoInput: '',
    isHotDeal: true,
    isExclusive: false,
  });
  const [creatingUnit, setCreatingUnit] = useState(false);

  // ----------------------------------------------------
  // Full-Featured Add Developer Project Form State
  // ----------------------------------------------------
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    developerName: 'Godrej Properties',
    projectName: 'Godrej Highlands',
    reraNumber: 'P52000029381',
    microMarket: 'Kharghar Sector 35',
    subLocality: 'Valley View Road, Sector 35',
    distanceToMetroKm: 0.6,
    hasOccupancyCertificate: true,
    commencementCertificateDate: '2022-04-15',
    expectedPossessionDate: '2026-12-31',
    totalTowers: 3,
    totalFloors: 24,
    basePricePerSqft: 14500,
    standardCommissionPercent: 2.5,
    developerSalesPocName: 'Rajesh Mehra (Sales VP)',
    developerSalesPocPhone: '+919876543210',
    brochureUrl: 'https://example.com/brochure.pdf',
    youtubeWalkthroughUrl: 'https://youtube.com/watch?v=sample-walkthrough',
    masterPlanUrl: 'https://example.com/masterplan.jpg',
    amenities: [
      'Clubhouse',
      'Swimming Pool',
      'Gymnasium',
      'Children Play Area',
      '24x7 Security & CCTV',
      'EV Charging Station',
      'High-Speed Elevators',
    ],
  });
  const [creatingProject, setCreatingProject] = useState(false);

  const availableAmenitiesList = [
    'Clubhouse',
    'Swimming Pool',
    'Gymnasium',
    'Children Play Area',
    '24x7 Security & CCTV',
    'EV Charging Station',
    'High-Speed Elevators',
    'Badminton Court',
    'Jogging Track',
    'Landscaped Gardens',
    'Power Backup',
    'Intercom Facility',
    'Rooftop Lounge',
  ];

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const [unitsRes, projectsRes] = await Promise.all([
        fetch('/api/v1/inventory/units'),
        fetch('/api/v1/inventory/projects'),
      ]);
      const unitsData = await unitsRes.json();
      const projectsData = await projectsRes.json();

      if (unitsData.success) setUnits(unitsData.data);
      if (projectsData.success) {
        setProjects(projectsData.data);
        if (projectsData.data.length > 0 && !unitForm.projectId) {
          setUnitForm((prev) => ({ ...prev, projectId: projectsData.data[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Compute live real-time all-in breakdown for the Unit modal form
  const selectedProjForUnit = projects.find((p) => p.id === unitForm.projectId);
  const isOcUnit = unitForm.possessionStatus === 'READY_TO_MOVE' || selectedProjForUnit?.hasOccupancyCertificate;
  const agreementVal = Number(unitForm.agreementValue) || 0;
  const stampDutyAmt = Math.round((agreementVal * (Number(unitForm.stampDutyRate) || 6)) / 100);
  const registrationAmt = Math.min(30000, Number(unitForm.registrationFee) || 30000);
  const gstRateVal = isOcUnit ? 0 : 5;
  const gstAmt = Math.round((agreementVal * gstRateVal) / 100);
  const floorRiseAmt = Math.max(0, (Number(unitForm.floorNumber) - 1) * 50 * Number(unitForm.carpetAreaSqft));
  const parkingAmt = Number(unitForm.parkingCharges) || 0;
  const societyAmt = Number(unitForm.societyDevelopmentCharges) || 0;
  const computedAllInTotal = agreementVal + stampDutyAmt + registrationAmt + gstAmt + floorRiseAmt + parkingAmt + societyAmt;

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyModalUnit) return;
    setSubmittingAudit(true);
    setAuditSuccessMsg('');

    try {
      const res = await fetch(`/api/v1/inventory/units/${verifyModalUnit.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStatus,
          auditNotes: auditNotes || 'Physical & telephonic audit completed. Price sheet confirmed with developer.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAuditSuccessMsg(`Successfully updated to ${targetStatus}!`);
        setTimeout(() => {
          setVerifyModalUnit(null);
          setAuditSuccessMsg('');
          fetchInventory();
        }, 1000);
      } else {
        alert(data.error || 'Failed to update verification status');
      }
    } catch (err: any) {
      alert(err.message || 'Error verifying unit');
    } finally {
      setSubmittingAudit(false);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.projectId) {
      alert('Please select a parent developer project');
      return;
    }
    setCreatingUnit(true);
    try {
      const res = await fetch('/api/v1/inventory/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: unitForm.projectId,
          unitNumber: unitForm.unitNumber,
          bhk: Number(unitForm.bhk),
          bathrooms: Number(unitForm.bathrooms),
          balconies: Number(unitForm.balconies),
          floorNumber: Number(unitForm.floorNumber),
          totalFloors: Number(unitForm.totalFloors),
          carpetAreaSqft: Number(unitForm.carpetAreaSqft),
          facing: unitForm.facing,
          possessionStatus: unitForm.possessionStatus,
          possessionDate: unitForm.possessionDate ? new Date(unitForm.possessionDate).toISOString() : null,
          agreementValue: Number(unitForm.agreementValue),
          stampDutyRate: Number(unitForm.stampDutyRate),
          registrationFee: Number(unitForm.registrationFee),
          parkingCharges: Number(unitForm.parkingCharges),
          societyDevelopmentCharges: Number(unitForm.societyDevelopmentCharges),
          verificationStatus: unitForm.verificationStatus,
          verificationNotes: unitForm.verificationNotes,
          photoGallery: unitForm.photoUrls,
          videoReelUrl: unitForm.videoReelUrl,
          isHotDeal: unitForm.isHotDeal,
          isExclusive: unitForm.isExclusive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchInventory();
      } else {
        alert(data.error || 'Failed to create unit');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating unit');
    } finally {
      setCreatingUnit(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingProject(true);
    try {
      const res = await fetch('/api/v1/inventory/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          developerName: projectForm.developerName,
          projectName: projectForm.projectName,
          reraNumber: projectForm.reraNumber,
          microMarket: projectForm.microMarket,
          subLocality: projectForm.subLocality,
          distanceToMetroKm: Number(projectForm.distanceToMetroKm),
          hasOccupancyCertificate: projectForm.hasOccupancyCertificate,
          commencementCertificateDate: projectForm.commencementCertificateDate ? new Date(projectForm.commencementCertificateDate).toISOString() : null,
          expectedPossessionDate: projectForm.expectedPossessionDate ? new Date(projectForm.expectedPossessionDate).toISOString() : null,
          totalTowers: Number(projectForm.totalTowers),
          totalFloors: Number(projectForm.totalFloors),
          basePricePerSqft: Number(projectForm.basePricePerSqft),
          standardCommissionPercent: Number(projectForm.standardCommissionPercent),
          developerSalesPocName: projectForm.developerSalesPocName,
          developerSalesPocPhone: projectForm.developerSalesPocPhone,
          brochureUrl: projectForm.brochureUrl,
          youtubeWalkthroughUrl: projectForm.youtubeWalkthroughUrl,
          masterPlanUrl: projectForm.masterPlanUrl,
          amenities: projectForm.amenities,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddProjectModal(false);
        fetchInventory();
      } else {
        alert(data.error || 'Failed to catalog project');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating project');
    } finally {
      setCreatingProject(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setProjectForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const addPhotoUrl = () => {
    if (unitForm.newPhotoInput.trim()) {
      setUnitForm((prev) => ({
        ...prev,
        photoUrls: [...prev.photoUrls, prev.newPhotoInput.trim()],
        newPhotoInput: '',
      }));
    }
  };

  const removePhotoUrl = (index: number) => {
    setUnitForm((prev) => ({
      ...prev,
      photoUrls: prev.photoUrls.filter((_, i) => i !== index),
    }));
  };

  // Filtered list
  const filteredUnits = units.filter((u) => {
    if (selectedMarket !== 'ALL' && u.project.microMarket !== selectedMarket) return false;
    if (selectedBhk !== 'ALL' && u.bhk !== Number(selectedBhk)) return false;
    if (selectedStatus !== 'ALL' && u.freshness.effectiveMarketableStatus !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchProject = u.project.projectName.toLowerCase().includes(q);
      const matchMarket = u.project.microMarket.toLowerCase().includes(q);
      const matchRera = u.project.reraNumber.toLowerCase().includes(q);
      const matchUnit = u.unitNumber?.toLowerCase().includes(q);
      if (!matchProject && !matchMarket && !matchRera && !matchUnit) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#b59658]/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b202c] border border-[#b59658]/40 text-[#ccb67b] text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#b59658]" />
            MahaRERA Audit &amp; Capitalized Cost ($C_{'{'}all-in{'}'}$)
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5 font-display">
            Verified Inventory Authority
          </h1>
          <p className="text-slate-400 text-xs mt-0.5 font-sans">
            MahaRERA Enforced • 14-Day Anti-Staleness Protection • Real Capitalized Cost Breakdown
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchInventory}
            className="p-2.5 rounded-xl bg-[#1b202c] hover:bg-[#2a3040] text-slate-300 hover:text-white border border-[#b59658]/30 transition-all flex items-center gap-2 text-xs font-semibold shadow-sm"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowAddProjectModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-[#1b202c] hover:bg-[#2a3040] text-[#ccb67b] border border-[#b59658]/50 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Building2 className="w-4 h-4 text-[#b59658]" />
            Add Developer Project
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/60"
          >
            <Plus className="w-4 h-4 text-[#12151f]" />
            Add Property Unit
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-panel p-4 rounded-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by project, unit, RERA number, or locality..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ccb67b] transition-all"
            />
          </div>

          {/* Micro-Market Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs font-semibold">Market:</span>
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ccb67b]"
            >
              <option value="ALL">All Micro-Markets</option>
              <option value="Kharghar Sector 35">Kharghar Sector 35</option>
              <option value="Kharghar Sector 36">Kharghar Sector 36</option>
              <option value="Kharghar Sector 20">Kharghar Sector 20</option>
              <option value="Taloja Phase 1">Taloja Phase 1</option>
              <option value="Taloja Phase 2">Taloja Phase 2</option>
            </select>
          </div>

          {/* BHK Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs font-semibold">BHK:</span>
            <select
              value={selectedBhk}
              onChange={(e) => setSelectedBhk(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ccb67b]"
            >
              <option value="ALL">All Configurations</option>
              <option value="1">1 BHK</option>
              <option value="2">2 BHK</option>
              <option value="3">3 BHK</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs font-semibold">Audit:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#ccb67b]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE_MARKETABLE">Active Marketable (&lt;14d)</option>
              <option value="STALE_EXPIRED">Stale Expired (&gt;14d)</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Grid Stream */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#ccb67b]" />
          <span>Loading verified properties...</span>
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-white font-semibold">No property units found matching current filters.</p>
          <p className="text-xs text-slate-400">Try adjusting your search query, or click &quot;Add Property Unit&quot; above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUnits.map((unit) => {
            const isFresh = unit.freshness.effectiveMarketableStatus === 'ACTIVE_MARKETABLE';
            const isStale = unit.freshness.effectiveMarketableStatus === 'STALE_EXPIRED';
            const daysAgo = unit.freshness.daysSinceVerification;

            return (
              <div
                key={unit.id}
                className={`glass-panel p-5 rounded-3xl border transition-all space-y-4 flex flex-col justify-between ${
                  isStale ? 'border-red-900/60 bg-red-950/10' : 'border-slate-800 hover:border-[#b59658]/40'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-900 border border-slate-700 text-slate-200 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#ccb67b]" />
                      {unit.bhk} BHK • Unit {unit.unitNumber || 'N/A'}
                    </span>

                    {/* Freshness Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                        isFresh
                          ? 'bg-[#1b202c] text-[#ccb67b] border-[#b59658]/40'
                          : isStale
                          ? 'bg-red-950 text-red-400 border-red-800 animate-pulse'
                          : 'bg-amber-950 text-amber-400 border-amber-800'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {isFresh ? `Active (${daysAgo}d old)` : isStale ? `Stale (${daysAgo}d unverified)` : unit.freshness.effectiveMarketableStatus}
                    </span>
                  </div>

                  {/* Project & Location */}
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">
                      {unit.project.projectName}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      {unit.project.microMarket} • {unit.project.distanceToMetroKm} km to Metro
                    </p>
                  </div>

                  {/* Specs Pill Grid */}
                  <div className="grid grid-cols-3 gap-2 py-1 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Carpet</span>
                      <strong className="text-slate-200 font-mono">{unit.carpetAreaSqft} sqft</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Floor</span>
                      <strong className="text-slate-200 font-mono">{unit.floorNumber}/{unit.totalFloors}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Possession</span>
                      <strong className="text-[#ccb67b] text-[10px] block font-semibold truncate">
                        {unit.possessionStatus === 'READY_TO_MOVE' ? 'Ready (OC)' : 'Under Const.'}
                      </strong>
                    </div>
                  </div>

                  {/* Financial Breakdown Box */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Base Agreement:</span>
                      <span className="font-mono text-slate-200 font-semibold">
                        ₹{(unit.agreementValue / 100000).toFixed(2)} Lakhs
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-400 text-[11px]">
                      <span>Statutory (Stamp + Reg + GST):</span>
                      <span className="font-mono text-slate-300">
                        ₹{(((unit.allInTotalCost - unit.agreementValue) / 100000)).toFixed(2)} Lakhs
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 text-white font-bold">
                      <span className="text-[#ccb67b] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#b59658]" />
                        All-In Capitalized ($C_{'{'}all-in{'}'}$):
                      </span>
                      <span className="font-mono text-sm text-[#ccb67b]">
                        ₹{(unit.allInTotalCost / 100000).toFixed(2)} Lakhs
                      </span>
                    </div>
                  </div>

                  {/* MahaRERA & Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
                    <span className="font-mono text-[10px] text-slate-400">
                      RERA: <strong className="text-slate-300">{unit.project.reraNumber}</strong>
                    </span>
                    {unit.isHotDeal && (
                      <span className="text-amber-400 text-[10px] font-bold flex items-center gap-0.5">
                        <Flame className="w-3 h-3 text-amber-500" /> Hot Deal
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      setCalcModalUnit(unit);
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Calculator className="w-3.5 h-3.5 text-amber-400" />
                    All-In Cost
                  </button>

                  <button
                    onClick={() => {
                      setVerifyModalUnit(unit);
                      setTargetStatus(unit.freshness.effectiveMarketableStatus === 'ACTIVE_MARKETABLE' ? 'ACTIVE_MARKETABLE' : 'ACTIVE_MARKETABLE');
                      setAuditNotes('');
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isStale
                        ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                        : 'bg-[#1b202c] hover:bg-[#2a3040] text-[#ccb67b] border border-[#b59658]/40'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#b59658]" />
                    Re-Verify
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Full-Featured Add Property Unit Form                             */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-2xl w-full p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#ccb67b]" />
                  Add Verified Property Flat / Unit
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete unit specs, pricing breakdown, and media attachments.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="space-y-4 text-xs">
              {/* Section 1: Project & Identification */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] font-bold text-[#ccb67b] uppercase tracking-wider block">
                  1. Project &amp; Unit Identification
                </span>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Select Developer Project <span className="text-[#ccb67b]">*</span>
                  </label>
                  <select
                    required
                    value={unitForm.projectId}
                    onChange={(e) => setUnitForm({ ...unitForm, projectId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ccb67b]"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectName} ({p.microMarket}) • {p.developerName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">
                      Unit / Flat Number <span className="text-[#ccb67b]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. A-1204"
                      value={unitForm.unitNumber}
                      onChange={(e) => setUnitForm({ ...unitForm, unitNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">
                      Floor Number <span className="text-[#ccb67b]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={unitForm.floorNumber}
                      onChange={(e) => setUnitForm({ ...unitForm, floorNumber: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">
                      Total Floors in Tower <span className="text-[#ccb67b]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={unitForm.totalFloors}
                      onChange={(e) => setUnitForm({ ...unitForm, totalFloors: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Unit Facing (Vastu)</label>
                    <select
                      value={unitForm.facing}
                      onChange={(e) => setUnitForm({ ...unitForm, facing: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="EAST">East (Morning Sun / Auspicious)</option>
                      <option value="NORTH_EAST">North-East (Ishanya / Prime)</option>
                      <option value="NORTH">North (Cool Breeze)</option>
                      <option value="WEST">West (Sunset View)</option>
                      <option value="SOUTH_EAST">South-East (Agneya)</option>
                      <option value="SOUTH">South Facing</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Possession Status</label>
                    <select
                      value={unitForm.possessionStatus}
                      onChange={(e) => setUnitForm({ ...unitForm, possessionStatus: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="READY_TO_MOVE">Ready to Move (OC Received • 0% GST)</option>
                      <option value="UNDER_CONSTRUCTION">Under Construction (5% GST)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Configuration & Specs */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] font-bold text-[#ccb67b] uppercase tracking-wider block">
                  2. Configuration &amp; Area Specifications
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">BHK Config</label>
                    <select
                      value={unitForm.bhk}
                      onChange={(e) => setUnitForm({ ...unitForm, bhk: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    >
                      <option value={1}>1 BHK</option>
                      <option value={2}>2 BHK</option>
                      <option value={3}>3 BHK</option>
                      <option value={4}>4 BHK</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Carpet (sq.ft)</label>
                    <input
                      type="number"
                      required
                      value={unitForm.carpetAreaSqft}
                      onChange={(e) => setUnitForm({ ...unitForm, carpetAreaSqft: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Bathrooms</label>
                    <select
                      value={unitForm.bathrooms}
                      onChange={(e) => setUnitForm({ ...unitForm, bathrooms: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value={1}>1 Bath</option>
                      <option value={2}>2 Baths</option>
                      <option value={3}>3 Baths</option>
                      <option value={4}>4 Baths</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Balconies</label>
                    <select
                      value={unitForm.balconies}
                      onChange={(e) => setUnitForm({ ...unitForm, balconies: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value={0}>0 Balcony</option>
                      <option value={1}>1 Balcony</option>
                      <option value={2}>2 Balconies</option>
                      <option value={3}>3 Balconies</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Financials & All-In Cost Breakdown */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] font-bold text-[#ccb67b] uppercase tracking-wider block">
                  3. Pricing &amp; Statutory Out-of-Pocket Charges
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">
                      Agreement Base Value (₹) <span className="text-[#ccb67b]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      step={50000}
                      value={unitForm.agreementValue}
                      onChange={(e) => setUnitForm({ ...unitForm, agreementValue: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Covered Parking (₹)</label>
                    <input
                      type="number"
                      step={25000}
                      value={unitForm.parkingCharges}
                      onChange={(e) => setUnitForm({ ...unitForm, parkingCharges: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Society Dev / Club (₹)</label>
                    <input
                      type="number"
                      step={25000}
                      value={unitForm.societyDevelopmentCharges}
                      onChange={(e) => setUnitForm({ ...unitForm, societyDevelopmentCharges: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Stamp Duty %</label>
                    <select
                      value={unitForm.stampDutyRate}
                      onChange={(e) => setUnitForm({ ...unitForm, stampDutyRate: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value={6.0}>6.0% (Standard Maharashtra Male/Joint)</option>
                      <option value={5.0}>5.0% (Female Buyer 1% Concession)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Registration Cap (₹)</label>
                    <input
                      type="number"
                      value={unitForm.registrationFee}
                      onChange={(e) => setUnitForm({ ...unitForm, registrationFee: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Live Real-time Calculation Preview Callout */}
                <div className="p-3 rounded-xl bg-[#1b202c] border border-[#b59658]/30 space-y-1.5 text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#ccb67b]">Live Statutory Computation:</span>
                    <span className="font-mono text-white text-xs">
                      Agreement: ₹{(agreementVal / 100000).toFixed(2)}L
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-300 pt-1">
                    <div>Stamp Duty: <strong className="text-white">₹{(stampDutyAmt / 1000).toFixed(1)}k</strong></div>
                    <div>Registration: <strong className="text-white">₹{(registrationAmt / 1000).toFixed(1)}k</strong></div>
                    <div>GST ({gstRateVal}%): <strong className="text-white">₹{(gstAmt / 1000).toFixed(1)}k</strong></div>
                    <div>Floor Rise: <strong className="text-white">₹{(floorRiseAmt / 1000).toFixed(1)}k</strong></div>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 text-white font-bold">
                    <span>Total All-In Capitalized ($C_{'{'}all-in{'}'}$):</span>
                    <span className="font-mono text-sm text-[#ccb67b]">
                      ₹{(computedAllInTotal / 100000).toFixed(2)} Lakhs
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4: Media, Reel & Marketing Badges */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] font-bold text-[#ccb67b] uppercase tracking-wider block">
                  4. Media, Video Reel &amp; Marketing Badges
                </span>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    YouTube Short / Instagram Reel Walkthrough URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/shorts/... or instagram.com/reel/..."
                    value={unitForm.videoReelUrl}
                    onChange={(e) => setUnitForm({ ...unitForm, videoReelUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Photo Gallery URLs ({unitForm.photoUrls.length} Photos Added)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Paste image URL (Unsplash, CDN, or Cloudinary)..."
                      value={unitForm.newPhotoInput}
                      onChange={(e) => setUnitForm({ ...unitForm, newPhotoInput: e.target.value })}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={addPhotoUrl}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                    >
                      + Add Image
                    </button>
                  </div>

                  {/* Photo chips */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {unitForm.photoUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-300 flex items-center gap-1.5 max-w-[280px] truncate"
                      >
                        <ImageIcon className="w-3 h-3 text-[#ccb67b] shrink-0" />
                        <span className="truncate">{url}</span>
                        <button
                          type="button"
                          onClick={() => removePhotoUrl(idx)}
                          className="text-red-400 hover:text-red-300 font-bold ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                    <input
                      type="checkbox"
                      checked={unitForm.isHotDeal}
                      onChange={(e) => setUnitForm({ ...unitForm, isHotDeal: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-[#b59658] focus:ring-0"
                    />
                    <span className="flex items-center gap-1 text-amber-400">
                      <Flame className="w-3.5 h-3.5" /> Mark as Hot Deal 🔥
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                    <input
                      type="checkbox"
                      checked={unitForm.isExclusive}
                      onChange={(e) => setUnitForm({ ...unitForm, isExclusive: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-[#b59658] focus:ring-0"
                    />
                    <span className="flex items-center gap-1 text-[#ccb67b]">
                      <Star className="w-3.5 h-3.5" /> Exclusive Mandate ⭐
                    </span>
                  </label>
                </div>
              </div>

              {/* Section 5: Verification Audit Notes */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] font-bold text-[#ccb67b] uppercase tracking-wider block">
                  5. Verification Audit Trail
                </span>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Verification Status</label>
                  <select
                    value={unitForm.verificationStatus}
                    onChange={(e) => setUnitForm({ ...unitForm, verificationStatus: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="ACTIVE_MARKETABLE">ACTIVE_MARKETABLE (Verified &amp; Ready for Portals)</option>
                    <option value="RERA_VERIFIED">RERA_VERIFIED (Documents Approved)</option>
                    <option value="PHYSICALLY_AUDITED">PHYSICALLY_AUDITED (Site Inspection Complete)</option>
                    <option value="DRAFT">DRAFT (Under Review)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Broker Audit Notes</label>
                  <textarea
                    rows={2}
                    value={unitForm.verificationNotes}
                    onChange={(e) => setUnitForm({ ...unitForm, verificationNotes: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUnit}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/60"
                >
                  {creatingUnit ? 'Saving Unit...' : 'Save & Calculate All-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Full-Featured Add Developer Project Form                         */}
      {/* ========================================================================= */}
      {showAddProjectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-2xl w-full p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#ccb67b]" />
                  Catalog New Developer Project
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  MahaRERA compliance, micro-market coordinates, broker commercials, and amenities.
                </p>
              </div>
              <button
                onClick={() => setShowAddProjectModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              {/* Section 1: Developer & Project Identity */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] font-bold text-[#ccb67b] uppercase tracking-wider block">
                  1. Developer &amp; Project Identity
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">
                      Developer / Builder Name <span className="text-[#ccb67b]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Godrej Properties"
                      value={projectForm.developerName}
                      onChange={(e) => setProjectForm({ ...projectForm, developerName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">
                      Project Name <span className="text-[#ccb67b]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Godrej Highlands"
                      value={projectForm.projectName}
                      onChange={(e) => setProjectForm({ ...projectForm, projectName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">
                      MahaRERA Registration No. <span className="text-[#ccb67b]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="P520000..."
                      value={projectForm.reraNumber}
                      onChange={(e) => setProjectForm({ ...projectForm, reraNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">
                      Micro-Market <span className="text-[#ccb67b]">*</span>
                    </label>
                    <select
                      value={projectForm.microMarket}
                      onChange={(e) => setProjectForm({ ...projectForm, microMarket: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="Kharghar Sector 35">Kharghar Sector 35 (Valley Corridor)</option>
                      <option value="Kharghar Sector 36">Kharghar Sector 36 (Metro Hub)</option>
                      <option value="Kharghar Sector 20">Kharghar Sector 20 (Established Core)</option>
                      <option value="Kharghar Sector 10">Kharghar Sector 10 (Central Park Zone)</option>
                      <option value="Taloja Phase 1">Taloja Phase 1 (Metro Corridor)</option>
                      <option value="Taloja Phase 2">Taloja Phase 2 (Affordable Zone)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Sub-Locality / Landmark Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Near CIDCO Golf Course & Central Park"
                    value={projectForm.subLocality}
                    onChange={(e) => setProjectForm({ ...projectForm, subLocality: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Section 2: Construction & Connectivity */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] font-bold text-[#ccb67b] uppercase tracking-wider block">
                  2. Construction &amp; Metro Connectivity
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Dist to Metro (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={projectForm.distanceToMetroKm}
                      onChange={(e) => setProjectForm({ ...projectForm, distanceToMetroKm: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">OC Status</label>
                    <select
                      value={projectForm.hasOccupancyCertificate ? 'YES' : 'NO'}
                      onChange={(e) => setProjectForm({ ...projectForm, hasOccupancyCertificate: e.target.value === 'YES' })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="YES">OC Received (0% GST)</option>
                      <option value="NO">Under Construction</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Total Towers</label>
                    <input
                      type="number"
                      min={1}
                      value={projectForm.totalTowers}
                      onChange={(e) => setProjectForm({ ...projectForm, totalTowers: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Total Floors</label>
                    <input
                      type="number"
                      min={1}
                      value={projectForm.totalFloors}
                      onChange={(e) => setProjectForm({ ...projectForm, totalFloors: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Base Price / sq.ft (₹)</label>
                    <input
                      type="number"
                      value={projectForm.basePricePerSqft}
                      onChange={(e) => setProjectForm({ ...projectForm, basePricePerSqft: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Expected Possession Date</label>
                    <input
                      type="date"
                      value={projectForm.expectedPossessionDate}
                      onChange={(e) => setProjectForm({ ...projectForm, expectedPossessionDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Broker Commercials & Developer Contacts */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  3. Broker Commercials &amp; Developer Contacts
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Standard Brokerage %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={projectForm.standardCommissionPercent}
                      onChange={(e) => setProjectForm({ ...projectForm, standardCommissionPercent: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold text-[#ccb67b]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Sales VP / POC Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Mehra (VP Sales)"
                      value={projectForm.developerSalesPocName}
                      onChange={(e) => setProjectForm({ ...projectForm, developerSalesPocName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Sales POC Phone</label>
                    <input
                      type="tel"
                      placeholder="+919876543210"
                      value={projectForm.developerSalesPocPhone}
                      onChange={(e) => setProjectForm({ ...projectForm, developerSalesPocPhone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Media, Brochure & Amenities */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] font-bold text-[#ccb67b] uppercase tracking-wider block">
                  4. Media &amp; Project Amenities
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Brochure PDF URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={projectForm.brochureUrl}
                      onChange={(e) => setProjectForm({ ...projectForm, brochureUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">YouTube Walkthrough Video URL</label>
                    <input
                      type="url"
                      placeholder="https://youtube.com/..."
                      value={projectForm.youtubeWalkthroughUrl}
                      onChange={(e) => setProjectForm({ ...projectForm, youtubeWalkthroughUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Amenities Pills Selector */}
                <div>
                  <label className="font-semibold text-slate-300 block mb-1.5">
                    Select Amenities ({projectForm.amenities.length} Selected):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableAmenitiesList.map((amenity) => {
                      const isSelected = projectForm.amenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                            isSelected
                              ? 'bg-[#1b202c] border border-[#b59658]/50 text-[#ccb67b]'
                              : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {isSelected && '✓ '}
                          {amenity}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProject}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/60"
                >
                  {creatingProject ? 'Cataloging Project...' : 'Catalog Developer Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Re-Verify / Freshness Audit Modal                                */}
      {/* ========================================================================= */}
      {verifyModalUnit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#ccb67b]" />
                Physical &amp; Telephonic Audit
              </h3>
              <button
                onClick={() => setVerifyModalUnit(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <strong className="text-white text-sm block">{verifyModalUnit.project?.projectName}</strong>
                <p className="text-slate-400 text-xs">
                  {verifyModalUnit.bhk} BHK • Unit {verifyModalUnit.unitNumber} • {verifyModalUnit.project?.microMarket}
                </p>
                <p className="text-[#ccb67b] font-bold font-mono pt-1">
                  Agreement Value: ₹{(verifyModalUnit.agreementValue / 100000).toFixed(2)}L
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Target Status</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="ACTIVE_MARKETABLE">ACTIVE_MARKETABLE (Verified Available)</option>
                  <option value="PHYSICALLY_AUDITED">PHYSICALLY_AUDITED (Site Inspection Complete)</option>
                  <option value="STALE_EXPIRED">STALE_EXPIRED (Requires Verification)</option>
                  <option value="ARCHIVED_SOLD">ARCHIVED_SOLD (Sold Out)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Audit Notes</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Verified with developer sales VP Mr. Rajesh Mehra on 17 Aug. Unit A-1204 is available."
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              {auditSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-[#1b202c] border border-[#b59658]/40 text-[#ccb67b] text-xs font-semibold text-center">
                  {auditSuccessMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setVerifyModalUnit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAudit}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] text-xs font-extrabold shadow-md"
                >
                  {submittingAudit ? 'Submitting...' : 'Record Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Quick All-In Cost Calculator Breakdown Modal                     */}
      {/* ========================================================================= */}
      {calcModalUnit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-400" />
                Maharashtra All-In Cost Breakdown
              </h3>
              <button
                onClick={() => setCalcModalUnit(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <strong className="text-white text-sm block">{calcModalUnit.project?.projectName}</strong>
                <p className="text-slate-400 text-xs">
                  {calcModalUnit.bhk} BHK • Unit {calcModalUnit.unitNumber} • {calcModalUnit.project?.microMarket}
                </p>
              </div>

              <div className="space-y-2 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300">
                <div className="flex justify-between">
                  <span>Agreement Base Value:</span>
                  <span className="font-mono font-bold text-white">
                    ₹{(calcModalUnit.agreementValue / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Stamp Duty ({calcModalUnit.stampDutyRate}%):</span>
                  <span className="font-mono text-slate-300">
                    ₹{((calcModalUnit.agreementValue * calcModalUnit.stampDutyRate) / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Registration Fee (Capped):</span>
                  <span className="font-mono text-slate-300">
                    ₹{(calcModalUnit.registrationFee / 1000).toFixed(0)}k
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({calcModalUnit.gstRate}% on Agreement):</span>
                  <span className="font-mono text-slate-300">
                    ₹{((calcModalUnit.agreementValue * calcModalUnit.gstRate) / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Floor Rise &amp; Parking:</span>
                  <span className="font-mono text-slate-300">
                    ₹{(((calcModalUnit.floorRiseCharges || 0) + (calcModalUnit.parkingCharges || 0)) / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800 text-white font-bold text-sm">
                  <span className="text-[#ccb67b]">Total All-In ($C_{'{'}all-in{'}'}$):</span>
                  <span className="font-mono text-[#ccb67b]">
                    ₹{(calcModalUnit.allInTotalCost / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => setCalcModalUnit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

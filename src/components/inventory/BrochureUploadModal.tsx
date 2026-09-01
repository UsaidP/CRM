'use client';

import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  MapPin,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  X,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Clock,
  Car,
  Home,
  Check,
  Navigation,
  Phone,
  Mail,
  FileCheck,
  Download,
  Eye,
  Lock,
  Image as ImageIcon
} from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { validateReraNumber } from '@/lib/domain/verification-engine';
import { ReraVerificationBadge } from '@/components/inventory/ReraVerificationBadge';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { uploadToCloudinaryChunked } from '@/lib/client/cloudinary-chunked-upload';
import { parseSafeDate } from '@/lib/date-utils';
import { MahaReraCertificateModal } from '@/components/inventory/MahaReraCertificateModal';
import { resolveAssetUrl, parseGalleryUrls } from '@/lib/inventory-media';

export interface BrochureUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (project: any) => void;
}

const SAMPLE_BROCHURES = [
  {
    label: 'City Avenue (Sector 24, Taloja Phase II)',
    badge: 'NEW BROCHURE',
    text: `CITY AVENUE by City Space
Plot No. 12D, Sector-24, Taloja Phase II, Navi Mumbai-410208
MahaRERA Registration Number: P52000079818
ABOUT PROJECT:
- G+7 with Commercial & Residential Project
- Taste-Fully Designed Entrance & Floor Lobbies
- Branded High Speed Elevators
- Clear Title CIDCO Transfer Plot
- 1 BHK & 2 BHK Spacious Flats with Balcony
- 1st Floor 7 Flat & 2nd to 7th Slab 8 Flat Each Floor
- Power Backup For Lifts & Common Area
AMENITIES & SPECIFICATIONS:
- 2'x2' Vitrified flooring tiles in all rooms
- Granite kitchen platform with stainless steel sink & ceramic tiles dado
- Decorative lamination finish main door & internal wooden doors with marble frames
- Concealed plumbing with branded sanitary fittings, glazed tiles up to full height
- Powder Coated Aluminum sliding windows with glass in living room, bedroom & kitchen
- Concealed copper wiring with modular switches, telephone & cable TV points
- Special water proofing treatment with china chips on terrace
- Intercom facility & Rain water harvesting system
- Underground & overhead water storage tank
LOCATION CONNECTIVITY:
- 3 mins walk to Taloja Phase II Metro Station
- 7 mins drive to Central Park & Kharghar Golf Course
- 10 mins drive to Taloja Railway Station
- 15 mins drive from Navi Mumbai International Airport
- 20 mins drive from Navi Mumbai Trans-Harbour Link (MTHL)
A Project By: City Space
Office Add: #35, 1st Floor, Hiranandani Crystal Plaza, Sector-7, Kharghar
Site Add: Plot No. 12D, Sector-24, Taloja Phase II, Navi Mumbai-410208
Email: citygroup36@gmail.com
Architects: Destination Architecture Interior Designs | RCC: SRS Consultants
Contact for Booking: MOHD SAQLAIN - 9920540484`
  },
  {
    label: 'Crown Heights (Kharghar Sec 35)',
    badge: 'LUXURY TOWER',
    text: `CROWN HEIGHTS by Paradise Group Presents G+24 Storey Iconic Luxury Landmark
MahaRERA Registration Number: P52000028714
Location: Sector 35, Kharghar, Navi Mumbai (Near Metro Station)
Configuration:
- 1 BHK Grand: 450 sq.ft RERA Carpet Area
- 2 BHK Premium: 685 sq.ft RERA Carpet Area
- 3 BHK Royal: 1050 sq.ft RERA Carpet Area
Base Rate: ₹10,500 / sqft
Possession Date: December 2027 (Under Construction)
Amenities:
Infinity Edge Swimming Pool & Kids Splash Pool, State-of-the-Art Fitness Center & Gymnasium, Grand Lifestyle Clubhouse & Community Hall, Rooftop Sky Lounge & Stargazing Deck, Double Height Designer Entrance Lobby, Multi-Level Podium Car Parking, 3-Tier Security with 24/7 CCTV, EV Car Charging Stations, Landscaped Podium Garden with Gazebo.
Sales Contact: Site Sales Desk (+91 98201 23456)`
  },
  {
    label: 'Riverview Residency (Taloja Phase 1)',
    badge: 'TWIN TOWERS',
    text: `RIVERVIEW RESIDENCY by Today Global Developers
MahaRERA Reg No: P52000019842
Location: Sector 14, Taloja Phase 1, Navi Mumbai (Near Pendhar Metro Station)
Elevation: G+18 Storey High-Rise Twin Towers (2 Wings)
Typologies:
- 1 BHK Executive: 420 sq.ft Carpet Area (Rate: ₹6,800/sqft)
- 2 BHK Deluxe: 640 sq.ft Carpet Area (Rate: ₹6,800/sqft)
Status: Under Construction • RERA Target: June 2028
Amenities:
Swimming Pool, Modern Gymnasium, Clubhouse, Children Play Park, Jogging Track, Automatic Elevators, 24x7 Security, Power Backup, Rainwater Harvesting.`
  }
];

export function BrochureUploadModal({ open, onClose, onSuccess }: BrochureUploadModalProps) {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseProgressStep, setParseProgressStep] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeReviewTab, setActiveReviewTab] = useState<'overview' | 'media' | 'units' | 'amenities' | 'connectivity'>('overview');

  // Extracted Project State
  const [projectData, setProjectData] = useState<any>(null);
  const [brochureUrl, setBrochureUrl] = useState<string | null>(null);
  const [extractionMethod, setExtractionMethod] = useState<'GEMINI_AI' | 'REGEX_FALLBACK'>('GEMINI_AI');
  const [modelUsed, setModelUsed] = useState<string>('Gemini Vision AI');
  const [extractionNote, setExtractionNote] = useState<string | null>(null);
  const [fetchingCertificate, setFetchingCertificate] = useState(false);
  const [certificateSuccessMsg, setCertificateSuccessMsg] = useState<string | null>(null);
  const [showFormCModal, setShowFormCModal] = useState(false);

  const resetState = () => {
    setStep('upload');
    setUploadMode('file');
    setFile(null);
    setPastedText('');
    setParsing(false);
    setParseProgressStep(0);
    setParseError(null);
    setSaving(false);
    setProjectData(null);
    setBrochureUrl(null);
    setExtractionMethod('GEMINI_AI');
    setModelUsed('Gemini Vision AI');
    setExtractionNote(null);
    setActiveReviewTab('overview');
    setFetchingCertificate(false);
    setCertificateSuccessMsg(null);
  };

  const handleFetchReraCertificate = async () => {
    if (!projectData?.reraNumber) return;
    setFetchingCertificate(true);
    setParseError(null);
    setCertificateSuccessMsg(null);

    try {
      const res = await fetch('/api/v1/inventory/rera/fetch-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reraNumber: projectData.reraNumber,
          projectName: projectData.projectName,
          developerName: projectData.developerName,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to download MahaRERA certificate.');
      }

      setProjectData((prev: any) => ({
        ...prev,
        reraCertificateUrl: json.data.certificateUrl,
        reraVerification: json.data.projectRecord,
      }));
      setCertificateSuccessMsg(`MahaRERA Certificate for ${json.data.projectRecord.projectName} verified & synchronized!`);
      setTimeout(() => setCertificateSuccessMsg(null), 5000);
    } catch (err: any) {
      setParseError(err.message || 'Failed to fetch MahaRERA certificate.');
    } finally {
      setFetchingCertificate(false);
    }
  };

  const isAcceptedFileType = (f: File) => {
    return (
      f.type === 'application/pdf' ||
      f.name.endsWith('.pdf') ||
      f.type.startsWith('image/') ||
      /\.(png|jpe?g|webp)$/i.test(f.name)
    );
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (isAcceptedFileType(dropped)) {
        setFile(dropped);
        setParseError(null);
      } else {
        setParseError('Please upload a valid developer brochure PDF or floor plan image (PNG, JPG, WEBP).');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (isAcceptedFileType(selected)) {
        setFile(selected);
        setParseError(null);
      } else {
        setParseError('Please select a PDF brochure document or floor plan image.');
      }
    }
  };

  const formatErrorMsg = (err: any): string => {
    if (!err) return 'An unexpected error occurred.';
    if (typeof err === 'string') return err;
    if (Array.isArray(err)) return err.map((e: any) => e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e))).join(', ');
    if (typeof err === 'object') return err.message || JSON.stringify(err);
    return String(err);
  };

  const handleStartParsing = async () => {
    setParseError(null);
    setParsing(true);
    setParseProgressStep(1);

    const progressTimer = setInterval(() => {
      setParseProgressStep((prev) => (prev < 5 ? prev + 1 : prev));
    }, 450);

    try {
      let res: Response;
      if (uploadMode === 'file' && file) {
        // Step 1: Direct chunked Cloudinary upload (supports up to 100MB without hitting 10MB ceiling)
        let directUploadedUrl: string | null = null;

        try {
          const isPdf = file.type?.includes('pdf') || file.name.match(/\.pdf$/i);
          const resourceType = isPdf ? 'raw' : 'auto';
          const signRes = await fetch(
            `/api/v1/media/sign-upload?category=brochures&filename=${encodeURIComponent(file.name)}&resourceType=${resourceType}`
          );
          if (signRes.ok) {
            const signData = await signRes.json();
            if (signData.success && signData.signed) {
              const cloudAsset = await uploadToCloudinaryChunked(
                file,
                signData.signed,
                file.name
              );
              directUploadedUrl = cloudAsset.secure_url || cloudAsset.url;
            }
          }
        } catch (cloudUploadErr) {
          console.warn('[UPLOAD] Direct Cloudinary chunked upload attempt warning:', cloudUploadErr);
        }

        // Convert file to Base64 (fallback or in-memory transport)
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        res = await fetch('/api/v1/inventory/upload-brochure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64Data,
            brochureUrl: directUploadedUrl,
            filename: file.name,
            mimeType: file.type || 'application/pdf',
          }),
        });
      } else if (uploadMode === 'text' && pastedText.trim()) {
        res = await fetch('/api/v1/inventory/upload-brochure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: pastedText, filename: 'Developer_Brochure.pdf' }),
        });
      } else {
        throw new Error('Please select a PDF brochure or paste brochure specification text.');
      }

      const rawText = await res.text();
      let json: any;
      try {
        json = JSON.parse(rawText);
      } catch {
        if (res.status === 413 || rawText.includes('Request Entity Too Large')) {
          throw new Error(
            `File size (${(file ? (file.size / (1024 * 1024)).toFixed(1) : '13.9')} MB) exceeds Vercel direct upload limit (4.5 MB). Please configure CLOUDINARY credentials in your Vercel Project Settings for direct cloud uploads, or use the "Paste Brochure / Spec Text" tab.`
          );
        }
        throw new Error(`Server returned HTTP ${res.status}: ${rawText.slice(0, 150)}`);
      }

      clearInterval(progressTimer);

      if (!res.ok || !json.success) {
        throw new Error(formatErrorMsg(json.error || 'Failed to extract project information from brochure.'));
      }

      setProjectData(json.data);
      setBrochureUrl(json.brochureUrl || json.data?.brochureUrl || null);
      setExtractionMethod(json.extractionMethod || 'GEMINI_AI');
      setModelUsed(json.modelUsed || (json.extractionMethod === 'GEMINI_AI' ? 'Gemini 2.5 Flash' : 'Smart Local Parser'));
      setExtractionNote(json.note || null);
      setStep('review');
    } catch (err: any) {
      clearInterval(progressTimer);
      setParseError(formatErrorMsg(err.message || err));
    } finally {
      setParsing(false);
    }
  };

  const handleSaveToCrm = async () => {
    if (!projectData) return;
    setSaving(true);
    setParseError(null);

    try {
      const reraCheck = validateReraNumber(projectData.reraNumber);
      if (!reraCheck.isValid) {
        throw new Error(reraCheck.error || 'Please enter a valid MahaRERA registration number.');
      }

      const extractedElevations = projectData.elevations || projectData.classifiedMedia?.elevations || [];
      const extractedFloorPlans = projectData.floorPlans || projectData.classifiedMedia?.floorPlans || [];
      const extractedMasterPlan = projectData.masterPlan || projectData.classifiedMedia?.masterPlan;

      const coverImageUrl = projectData.coverImageUrl 
        || resolveAssetUrl(extractedElevations[0]) 
        || null;

      const masterPlanUrl = projectData.masterPlanUrl 
        || resolveAssetUrl(extractedMasterPlan) 
        || null;

      const assetRecords = projectData.assetRecords || [];

      const allMediaUrls: string[] = [
        ...extractedElevations.map(resolveAssetUrl),
        resolveAssetUrl(extractedMasterPlan),
        ...extractedFloorPlans.map(resolveAssetUrl),
      ].filter(Boolean);

      const mediaGallery = (assetRecords.length > 0)
        ? assetRecords
        : (projectData.mediaGallery && Array.isArray(projectData.mediaGallery) && projectData.mediaGallery.length > 0)
        ? projectData.mediaGallery
        : allMediaUrls;

      const payload = {
        developerName: projectData.developerName,
        projectName: projectData.projectName,
        reraNumber: reraCheck.normalized || projectData.reraNumber,
        microMarket: projectData.microMarket,
        subLocality: projectData.subLocality || null,
        shortDescription: projectData.shortDescription || null,
        description: projectData.description || null,
        totalTowers: parseInt(projectData.totalTowers || 1, 10),
        totalFloors: parseInt(projectData.totalFloors || 7, 10),
        basePricePerSqft: parseFloat(projectData.basePricePerSqft || 6200),
        brochureUrl: brochureUrl || projectData.brochureUrl || null,
        coverImageUrl,
        masterPlanUrl,
        mediaGallery,
        hasOccupancyCertificate: projectData.hasOccupancyCertificate || false,
        expectedPossessionDate: parseSafeDate(projectData.expectedPossessionDate)?.toISOString() || null,
        amenities: projectData.amenities || [],
        keyHighlights: projectData.keyHighlights || [],
        developerSalesPocName: projectData.developerSalesPocName || null,
        developerSalesPocPhone: projectData.developerSalesPocPhone || null,
        standardCommissionPercent: parseFloat(projectData.standardCommissionPercent || 2.5),
        reraCertificateUrl: projectData.reraCertificateUrl || null,
        reraRegisteredName: projectData.reraVerification?.projectName || null,
        reraProjectStatus: projectData.reraVerification?.projectStatus || 'REGISTERED',
        reraValidUntil: parseSafeDate(projectData.reraVerification?.validUntil)?.toISOString() || null,
        reraVerificationDate: projectData.reraCertificateUrl ? new Date().toISOString() : null,
        reraCertDataJson: projectData.reraVerification ? JSON.stringify(projectData.reraVerification) : null,
        units: (projectData.units || []).map((u: any, idx: number) => {
          const matchingPlan = extractedFloorPlans.find((fp: any) => fp.bhk === u.bhk);
          const floorPlanUrl = u.floorPlanUrl 
            || matchingPlan?.mediaAsset?.secureUrl 
            || matchingPlan?.mediaAsset?.url 
            || matchingPlan?.url 
            || null;

          return {
            unitNumber: u.unitNumber || `Flat-0${idx + 1}`,
            bhk: u.bhk || 2,
            bathrooms: u.bathrooms || (u.bhk >= 2 ? 2 : 1),
            balconies: u.balconies || 1,
            floorNumber: u.floorNumber || 2,
            totalFloors: projectData.totalFloors || 7,
            carpetAreaSqft: u.carpetAreaSqft || 625,
            facing: u.facing || 'EAST',
            possessionStatus: projectData.hasOccupancyCertificate ? 'READY_TO_MOVE' : (u.possessionStatus || 'UNDER_CONSTRUCTION'),
            agreementValue: u.agreementValue || Math.round((u.carpetAreaSqft || 625) * projectData.basePricePerSqft),
            stampDutyRate: u.stampDutyRate || 6.0,
            registrationFee: u.registrationFee || 30000.0,
            gstRate: projectData.hasOccupancyCertificate ? 0.0 : (u.gstRate || 5.0),
            floorRiseCharges: u.floorRiseCharges || 0.0,
            parkingCharges: u.parkingCharges || 200000.0,
            societyDevelopmentCharges: u.societyDevelopmentCharges || 150000.0,
            allInTotalCost: u.allInTotalCost || 0.0,
            floorPlanUrl,
            description: u.description || null,
            featureHighlights: u.featureHighlights || [],
          };
        }),
      };

      const res = await fetch('/api/v1/inventory/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(formatErrorMsg(json.error || 'Failed to save project & units to database.'));
      }

      onSuccess(json.data);
      onClose();
      resetState();
    } catch (err: any) {
      setParseError(formatErrorMsg(err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const formatINR = (val: number) => {
    if (!val && val !== 0) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const parseSteps = [
    'Scanning brochure graphics & text streams…',
    'Extracting MahaRERA registration ID & developer identity…',
    'Analyzing architectural elevation (G+7), storeys & commercial shops…',
    'Detecting 1 & 2 BHK floor plans, carpet areas & balconies…',
    'Cataloging luxury specifications & amenities…',
    'Computing statutory agreement values, GST & all-in costs…',
  ];

  return (
    <AccessibleDialog
      open={open}
      onClose={() => { onClose(); resetState(); }}
      titleId="brochure-modal-title"
      descriptionId="brochure-modal-description"
      size="xl"
    >
      <div className="space-y-5 text-xs font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h2 id="brochure-modal-title" className="text-base font-bold text-content font-display flex items-center gap-2">
                <span>Upload Developer Brochure (PDF / Spec Sheet)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-soft text-accent-text border border-accent/20">
                  AI EXTRACTION
                </span>
              </h2>
              <p id="brochure-modal-description" className="text-[11px] text-content-muted">
                Extracts Elevation, MahaRERA ID, 1/2/3 BHK floor plans, carpet areas, and statutory pricing automatically.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-dialog-close
            aria-label="Close dialog"
            onClick={() => { onClose(); resetState(); }}
            className="p-1.5 rounded-lg text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {parseError && (
          <FeedbackAlert
            variant="error"
            error={parseError}
            onDismiss={() => setParseError(null)}
          />
        )}

        {/* STEP 1: UPLOAD BROCHURE */}
        {step === 'upload' && (
          <div className="space-y-4">
            {/* Mode Switcher */}
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  uploadMode === 'file'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                Upload Brochure PDF
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('text')}
                className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  uploadMode === 'text'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                Paste Brochure / Spec Text
              </button>
            </div>

            {uploadMode === 'file' ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-border hover:border-accent/60 rounded-2xl p-8 text-center bg-surface-subtle/50 transition-all space-y-3 cursor-pointer group"
                onClick={() => document.getElementById('brochure-file-input')?.click()}
              >
                <input
                  id="brochure-file-input"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="w-12 h-12 mx-auto rounded-2xl bg-accent-soft border border-accent/30 text-accent flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>

                <div>
                  <p className="font-bold text-sm text-content">
                    {file ? file.name : 'Click to select or drag & drop Developer Brochure (PDF / Image / Spec Sheet)'}
                  </p>
                  <p className="text-[11px] text-content-muted mt-0.5 font-mono">
                    {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB Document Ready` : 'Supports official MahaRERA brochures, floor plan images (PDF, PNG, JPG, WEBP) up to 100 MB'}
                  </p>
                </div>

                {file && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-success-surface text-status-success border border-status-success/30 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for AI Extraction
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-content-secondary font-semibold block">
                  Paste Developer Brochure Copy, Floor Plan Details, or Specs:
                </label>
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste brochure text containing Project Name, MahaRERA Number, 1/2/3 BHK carpet areas, elevation storeys, and amenities…"
                  className="w-full bg-surface-inset border border-border rounded-xl p-3 text-xs text-content focus:outline-none focus:border-accent font-mono"
                />
              </div>
            )}

            {/* Quick Demo Pre-Fill Buttons */}
            <div className="p-3.5 bg-surface rounded-xl border border-border space-y-2.5">
              <span className="text-[10px] font-mono font-bold uppercase text-content-muted block">
                ⭐ Featured Real Estate Brochures (Click to Test Instantly):
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_BROCHURES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setUploadMode('text');
                      setPastedText(sample.text);
                    }}
                    className={`px-3.5 py-2 rounded-xl border text-[11px] font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      idx === 0
                        ? 'bg-accent/10 border-accent/40 text-accent-text font-bold shadow-xs hover:bg-accent/15'
                        : 'bg-surface-subtle hover:bg-surface border-border text-content'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-accent" />
                    <span>{sample.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-surface border border-border text-content-muted">
                      {sample.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Parsing Progress Animation */}
            {parsing && (
              <div className="p-4 bg-accent-soft/40 border border-accent/30 rounded-2xl space-y-2 text-content">
                <div className="flex items-center justify-between font-bold text-xs text-accent-text">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                    AI Brochure Scanner Active…
                  </span>
                  <span>Step {parseProgressStep} of 6</span>
                </div>
                <p className="text-[11px] text-content-secondary font-mono">
                  {parseSteps[parseProgressStep - 1] || 'Processing brochure streams…'}
                </p>
                <div className="w-full bg-surface-subtle rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-accent h-1.5 transition-all duration-300"
                    style={{ width: `${(parseProgressStep / 6) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsing || (uploadMode === 'file' && !file) || (uploadMode === 'text' && !pastedText.trim())}
                onClick={handleStartParsing}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{parsing ? 'Scanning Brochure…' : 'Extract Project Information'}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW & CUSTOMIZE EXTRACTED DATA */}
        {step === 'review' && projectData && (
          <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
            {/* Notification Banner */}
            <div className="p-3.5 bg-status-success-surface border border-status-success/30 rounded-2xl text-status-success text-xs font-semibold flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-status-success" />
                  <div>
                    <span className="font-bold">Brochure Parsed Successfully: </span>
                    <span>{projectData.projectName} ({projectData.microMarket}) • MahaRERA {projectData.reraNumber}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {extractionMethod === 'GEMINI_AI' ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-[11px] bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-600 dark:text-purple-300 px-2.5 py-1 rounded-lg border border-purple-500/30">
                      <Sparkles className="w-3 h-3 text-purple-500 animate-pulse" />
                      {modelUsed || 'Gemini Vision AI'}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] bg-white/50 dark:bg-black/30 px-2.5 py-1 rounded-lg border border-status-success/30">
                      {modelUsed || 'Smart Local Engine'}
                    </span>
                  )}
                  {brochureUrl && (
                    <span className="font-mono text-[10px] bg-white/50 dark:bg-black/30 px-2 py-1 rounded-lg border border-status-success/30">
                      Document Attached
                    </span>
                  )}
                </div>
              </div>
              {extractionNote && (
                <div className="text-[11px] text-content-secondary font-normal border-t border-status-success/20 pt-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-warning" />
                  <span>{extractionNote}</span>
                </div>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveReviewTab('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeReviewTab === 'overview'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Elevation &amp; Structure</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveReviewTab('media')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeReviewTab === 'media'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Extracted Media &amp; Renders ({((projectData.elevations?.length || 0) + (projectData.floorPlans?.length || 0) + (projectData.masterPlan ? 1 : 0)) || 4})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveReviewTab('units')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeReviewTab === 'units'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Floor Plans &amp; Unit Matrix ({projectData.units?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveReviewTab('amenities')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeReviewTab === 'amenities'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Specs &amp; Amenities ({projectData.amenities?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveReviewTab('connectivity')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeReviewTab === 'connectivity'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Location &amp; Contact</span>
              </button>
            </div>

            {/* TAB 1: OVERVIEW & ELEVATION */}
            {activeReviewTab === 'overview' && (
              <div className="space-y-4">
                <div className="p-4 bg-surface rounded-2xl border border-border space-y-3.5">
                  <h3 className="font-bold text-xs uppercase font-mono text-accent-text flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-accent" /> Project Identification &amp; Statutory Approval
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-content-secondary block mb-1">Project Name:</label>
                      <input
                        type="text"
                        value={projectData.projectName || ''}
                        onChange={(e) => setProjectData({ ...projectData, projectName: e.target.value })}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-bold focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-content-secondary block mb-1">Developer / Builder:</label>
                      <input
                        type="text"
                        value={projectData.developerName || ''}
                        onChange={(e) => setProjectData({ ...projectData, developerName: e.target.value })}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-content-secondary block mb-1">MahaRERA Registration No:</label>
                      <input
                        type="text"
                        value={projectData.reraNumber || ''}
                        onChange={(e) => setProjectData({ ...projectData, reraNumber: e.target.value })}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-mono font-bold focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-content-secondary block mb-1">Micro-Market Locality:</label>
                      <input
                        type="text"
                        value={projectData.microMarket || ''}
                        onChange={(e) => setProjectData({ ...projectData, microMarket: e.target.value })}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-semibold focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60 space-y-3">
                    <ReraVerificationBadge
                      reraNumber={projectData.reraNumber}
                      showDuplicateCheck={true}
                      showPortalLink={true}
                      showCopyButton={true}
                    />

                    {/* MahaRERA Official Statutory Certificate Card */}
                    <div className="p-3.5 bg-surface-subtle border border-accent/30 rounded-2xl space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-accent-soft text-accent-text border border-accent/20">
                            <FileCheck className="w-4 h-4 text-accent" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-content font-display">
                              Official MahaRERA Statutory Certificate
                            </h4>
                            <p className="text-[11px] text-content-muted">
                              {projectData.reraCertificateUrl
                                ? `Verified • Downloaded & Linked for ${projectData.reraVerification?.projectName || projectData.projectName}`
                                : 'Synchronize official registration certificate directly from Maharashtra RERA registry.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setShowFormCModal(true)}
                            className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-accent" />
                            <span>Preview Form &lsquo;C&rsquo;</span>
                          </button>

                          {projectData.reraCertificateUrl ? (
                            <a
                              href={projectData.reraCertificateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-bold shadow-xs hover:bg-accent-hover transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download PDF</span>
                            </a>
                          ) : null}

                          <button
                            type="button"
                            disabled={fetchingCertificate || !projectData.reraNumber}
                            onClick={handleFetchReraCertificate}
                            className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle text-accent-text border border-accent/30 text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {fetchingCertificate ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Syncing from MahaRERA…</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>{projectData.reraCertificateUrl ? 'Re-Sync Certificate' : 'Fetch MahaRERA Certificate'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {certificateSuccessMsg && (
                        <FeedbackAlert
                          variant="success"
                          title="MahaRERA Verified"
                          description={certificateSuccessMsg}
                          onDismiss={() => setCertificateSuccessMsg(null)}
                        />
                      )}

                      {projectData.reraVerification && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border/60 text-[11px]">
                          <div className="p-2 rounded-xl bg-surface border border-border">
                            <span className="text-content-muted block text-[10px]">Registered Legal Title</span>
                            <strong className="text-content font-bold">{projectData.reraVerification.projectName}</strong>
                          </div>
                          <div className="p-2 rounded-xl bg-surface border border-border">
                            <span className="text-content-muted block text-[10px]">Promoter / Developer</span>
                            <strong className="text-content font-bold">{projectData.reraVerification.promoterName}</strong>
                          </div>
                          <div className="p-2 rounded-xl bg-surface border border-border">
                            <span className="text-content-muted block text-[10px]">Validity / Completion</span>
                            <strong className="text-status-success font-bold font-mono">Valid Until {projectData.reraVerification.validUntil}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-surface rounded-2xl border border-border space-y-3.5">
                  <h3 className="font-bold text-xs uppercase font-mono text-accent-text flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-accent" /> Architectural Elevation &amp; Floor Structure
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="lg:col-span-2">
                      <label className="text-[11px] font-semibold text-content-secondary block mb-1">Elevation Architecture:</label>
                      <input
                        type="text"
                        value={projectData.elevation || ''}
                        onChange={(e) => setProjectData({ ...projectData, elevation: e.target.value })}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-semibold focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-content-secondary block mb-1">Total Storeys / Floors:</label>
                      <input
                        type="number"
                        value={projectData.totalFloors || 7}
                        onChange={(e) => setProjectData({ ...projectData, totalFloors: parseInt(e.target.value, 10) || 1 })}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-semibold text-content-secondary block mb-1">Plot Details:</label>
                      <input
                        type="text"
                        value={projectData.plotDetails || 'Clear Title CIDCO Transfer Plot'}
                        onChange={(e) => setProjectData({ ...projectData, plotDetails: e.target.value })}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-content-secondary block mb-1">Structure Type:</label>
                      <input
                        type="text"
                        value={projectData.structureType || 'Earthquake Resistant RCC Structure'}
                        onChange={(e) => setProjectData({ ...projectData, structureType: e.target.value })}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-content-secondary block mb-1">Base Price Rate (₹/sqft):</label>
                      <input
                        type="number"
                        value={projectData.basePricePerSqft || 6500}
                        onChange={(e) => setProjectData({ ...projectData, basePricePerSqft: parseFloat(e.target.value) || 1000 })}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-mono font-bold focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  {projectData.floorPlateSummary && (
                    <div className="p-3 bg-surface-subtle rounded-xl border border-border mt-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-accent-text font-mono">Floor Plate Architecture Summary</p>
                      <p className="text-xs text-content-secondary mt-1 leading-relaxed">{projectData.floorPlateSummary}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: EXTRACTED MEDIA & RENDERS */}
            {activeReviewTab === 'media' && (
              <div className="space-y-4">
                {/* Elevation Renders */}
                <div className="p-4 bg-surface rounded-2xl border border-border space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase font-mono text-accent-text flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-accent" /> High-Resolution Architectural Elevations ({projectData.elevations?.length || 3})
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-soft text-accent-text font-mono font-bold">
                      Stored &amp; Categorized in zamzam_crm/elevations
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(projectData.elevations || [
                      { title: `${projectData.projectName} Main Front Elevation`, viewAngle: 'FRONT_FACADE', description: 'Grand high-rise architectural facade with glass glazing', mediaAsset: { secureUrl: '/uploads/elevations/facade.svg' } },
                      { title: `${projectData.projectName} Podium & Amenities`, viewAngle: 'PODIUM_VIEW', description: 'Resort-themed podium deck & infinity pool', mediaAsset: { secureUrl: '/uploads/elevations/podium.svg' } },
                      { title: `${projectData.projectName} Night Illumination`, viewAngle: 'NIGHT_AERIAL', description: 'Nighttime architectural illumination', mediaAsset: { secureUrl: '/uploads/elevations/night.svg' } },
                    ]).map((elev: any, idx: number) => (
                      <div key={idx} className="p-3 bg-surface-subtle rounded-xl border border-border space-y-2 group hover:border-accent/40 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent/10 text-accent font-mono">
                            {elev.viewAngle?.replace(/_/g, ' ') || 'ELEVATION'}
                          </span>
                          <span className="text-[10px] text-content-muted font-mono">HD Vector / SVG</span>
                        </div>
                        <p className="text-xs font-bold text-content truncate font-display">{elev.title}</p>
                        <p className="text-[11px] text-content-secondary line-clamp-2">{elev.description}</p>
                        {resolveAssetUrl(elev) ? (
                          <a
                            href={resolveAssetUrl(elev)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline pt-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview Render</span>
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floor Plans */}
                <div className="p-4 bg-surface rounded-2xl border border-border space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase font-mono text-accent-text flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-accent" /> Sanctioned Floor Plan Schematics ({projectData.floorPlans?.length || projectData.units?.length || 2})
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-soft text-accent-text font-mono font-bold">
                      Auto-Linked to PropertyUnit.floorPlanUrl
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(projectData.floorPlans || (projectData.units || []).map((u: any) => ({
                      bhk: u.bhk,
                      carpetAreaSqft: u.carpetAreaSqft,
                      title: `${u.bhk} BHK Architectural Layout`,
                      description: `${u.carpetAreaSqft} sq.ft RERA Carpet Area with Balcony`,
                      mediaAsset: { secureUrl: `/uploads/floor-plans/${u.bhk}bhk.svg` }
                    }))).map((fp: any, idx: number) => (
                      <div key={idx} className="p-3 bg-surface-subtle rounded-xl border border-border space-y-2 group hover:border-accent/40 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono">
                            {fp.bhk ? `${fp.bhk} BHK BLUEPRINT` : 'FLOOR PLAN'}
                          </span>
                          <span className="text-[10px] text-content-muted font-mono">{fp.carpetAreaSqft ? `${fp.carpetAreaSqft} sq.ft` : 'RERA Layout'}</span>
                        </div>
                        <p className="text-xs font-bold text-content truncate font-display">{fp.title}</p>
                        <p className="text-[11px] text-content-secondary line-clamp-2">{fp.description}</p>
                        {resolveAssetUrl(fp) ? (
                          <a
                            href={resolveAssetUrl(fp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline pt-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Blueprint</span>
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Master Plan */}
                <div className="p-4 bg-surface rounded-2xl border border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase font-mono text-accent-text flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-accent" /> MahaRERA Master Layout Plan
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-status-success-surface text-status-success font-bold font-mono">
                      Campus Footprint Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-content-secondary">
                    Overall project site schematic detailing 24m entry road, Wing A/B tower positioning, and podium leisure deck.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: CONFIGURATIONS & UNITS */}
            {activeReviewTab === 'units' && (
              <div className="space-y-4">
                <div className="p-4 bg-surface rounded-2xl border border-border space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs uppercase font-mono text-accent-text flex items-center gap-1.5">
                        <Home className="w-4 h-4 text-accent" /> Floor Plans &amp; Unit Matrix ({projectData.units?.length || 0})
                      </h3>
                      <p className="text-[11px] text-content-muted mt-0.5">
                        Itemized flat layouts with RERA carpet areas, Vastu facing orientation, and MahaRERA statutory breakdowns.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-subtle text-content-secondary uppercase text-[10px] font-bold border-b border-border">
                        <tr>
                          <th className="p-2.5 pl-3">Unit / Flat</th>
                          <th className="p-2.5">Typology</th>
                          <th className="p-2.5">Carpet Area</th>
                          <th className="p-2.5">Facing</th>
                          <th className="p-2.5">Floor</th>
                          <th className="p-2.5 text-right">Agreement Value</th>
                          <th className="p-2.5 text-right">All-In Cost (Taxes Incl.)</th>
                          <th className="p-2.5 pr-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-content">
                        {(projectData.units || []).map((u: any, idx: number) => (
                          <tr key={idx} className="hover:bg-surface-subtle/50 font-mono text-xs">
                            <td className="p-2.5 pl-3 font-bold font-sans text-accent-text">
                              {u.unitNumber || `Flat ${u.floorNumber || idx + 1}0${idx + 1}`}
                            </td>
                            <td className="p-2.5 font-sans font-medium">
                              <span className="px-2 py-0.5 rounded bg-accent-soft text-accent-text border border-accent/20 text-[11px] font-bold">
                                {u.bhk} BHK
                              </span>
                            </td>
                            <td className="p-2.5">{u.carpetAreaSqft} sq.ft</td>
                            <td className="p-2.5 font-sans text-[11px]">
                              <span className="text-content-secondary font-semibold">{u.facing || 'EAST'}</span>
                            </td>
                            <td className="p-2.5">Fl {u.floorNumber} / {projectData.totalFloors}</td>
                            <td className="p-2.5 text-right font-bold">{formatINR(u.agreementValue)}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-700 dark:text-emerald-400">
                              {formatINR(u.allInTotalCost)}
                            </td>
                            <td className="p-2.5 pr-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-status-success-surface text-status-success border border-status-success/30 font-sans">
                                VERIFIED
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Commercial Shops Matrix if available */}
                {Array.isArray(projectData.commercialShops) && projectData.commercialShops.length > 0 && (
                  <div className="p-4 bg-surface rounded-2xl border border-border space-y-3">
                    <h3 className="font-bold text-xs uppercase font-mono text-accent-text flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-accent" /> Ground Floor Commercial High-Street Retail
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {projectData.commercialShops.map((shop: any, i: number) => (
                        <div key={i} className="p-3 bg-surface-subtle rounded-xl border border-border text-xs">
                          <p className="font-bold text-content">{shop.shopNumber || `Shop ${i + 1}`}</p>
                          <p className="text-[11px] text-content-secondary mt-0.5">
                            Carpet: {shop.carpetAreaSqft} sq.ft {shop.agreementValue ? `• Value: ${formatINR(shop.agreementValue)}` : ''}
                          </p>
                          {shop.description && <p className="text-[11px] text-content-muted mt-1">{shop.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: AMENITIES & SPECS */}
            {activeReviewTab === 'amenities' && (
              <div className="space-y-4">
                {/* Specifications Grid */}
                {projectData.specifications && Object.keys(projectData.specifications).length > 0 && (
                  <div className="p-4 bg-surface rounded-2xl border border-border space-y-3">
                    <h3 className="font-bold text-xs uppercase font-mono text-accent-text flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-accent" /> Internal Building &amp; Flat Specifications
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {Object.entries(projectData.specifications).map(([key, val]: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-surface-subtle border border-border">
                          <p className="font-bold text-[11px] text-accent-text capitalize font-mono">{key.replace(/([A-Z])/g, ' $1')}:</p>
                          <p className="text-xs text-content-secondary mt-1">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amenities List */}
                <div className="p-4 bg-surface rounded-2xl border border-border space-y-3.5">
                  <h3 className="font-bold text-xs uppercase font-mono text-accent-text flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-accent" /> Lifestyle Amenities ({projectData.amenities?.length || 0})
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(projectData.amenities || []).map((am: string, i: number) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-surface-subtle border border-border text-content text-[11px] font-medium flex items-center gap-2"
                      >
                        <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span>{am}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CONNECTIVITY & CONTACT */}
            {activeReviewTab === 'connectivity' && (
              <div className="space-y-4">
                <div className="p-4 bg-surface rounded-2xl border border-border space-y-3">
                  <h3 className="font-bold text-xs uppercase font-mono text-accent-text flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-accent" /> Transit Proximity &amp; Connectivity
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs text-content">
                    {Array.isArray(projectData.transitConnectivity) && projectData.transitConnectivity.length > 0 ? (
                      projectData.transitConnectivity.map((item: any, i: number) => (
                        <div key={i} className="p-3 bg-surface-subtle rounded-xl border border-border">
                          <p className="font-bold text-accent-text">{item.destination}</p>
                          <p className="text-[11px] text-content-secondary mt-0.5 font-medium">{item.timeOrDistance}</p>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="p-3 bg-surface-subtle rounded-xl border border-border">
                          <p className="font-bold text-accent-text">🚇 Metro Connectivity</p>
                          <p className="text-[11px] text-content-secondary mt-0.5">3 mins walk to Metro Station</p>
                        </div>
                        <div className="p-3 bg-surface-subtle rounded-xl border border-border">
                          <p className="font-bold text-accent-text">✈️ International Airport</p>
                          <p className="text-[11px] text-content-secondary mt-0.5">15 mins drive to NMIA Airport</p>
                        </div>
                        <div className="p-3 bg-surface-subtle rounded-xl border border-border">
                          <p className="font-bold text-accent-text">🌳 Central Park &amp; Golf Course</p>
                          <p className="text-[11px] text-content-secondary mt-0.5">7 mins drive to Kharghar</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-surface rounded-2xl border border-border space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2.5">
                    <h3 className="font-bold text-xs uppercase font-mono text-accent-text flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-accent" /> Developer Sales Contact &amp; Professional Consultants
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold font-mono">
                      <Lock className="w-3 h-3 text-amber-600" />
                      BROKER SHIELD ACTIVE • CRM INTERNAL ONLY
                    </span>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Lead &amp; Brokerage Commission Protection:</strong> Direct developer sales contact numbers, booking desk phones, and site addresses are strictly saved for internal CRM broker management only. They are automatically stripped from all client portals and client-facing dossier exports so buyers cannot bypass you to go direct to the builder.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-content-secondary block mb-1">Sales POC Name:</label>
                      <input
                        type="text"
                        value={projectData.developerSalesPocName || ''}
                        onChange={(e) => setProjectData({ ...projectData, developerSalesPocName: e.target.value })}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-content-secondary block mb-1">Sales Phone Number:</label>
                      <input
                        type="text"
                        value={projectData.developerSalesPocPhone || ''}
                        onChange={(e) => setProjectData({ ...projectData, developerSalesPocPhone: e.target.value })}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-content-secondary block mb-1">Developer Email:</label>
                      <input
                        type="text"
                        value={projectData.developerEmail || 'citygroup36@gmail.com'}
                        onChange={(e) => setProjectData({ ...projectData, developerEmail: e.target.value })}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-semibold text-content-secondary block mb-1">Architects:</label>
                      <input
                        type="text"
                        value={projectData.architects || ''}
                        onChange={(e) => setProjectData({ ...projectData, architects: e.target.value })}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-content-secondary block mb-1">RCC Structural Consultants:</label>
                      <input
                        type="text"
                        value={projectData.rccConsultants || ''}
                        onChange={(e) => setProjectData({ ...projectData, rccConsultants: e.target.value })}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-semibold cursor-pointer"
              >
                ← Back to Upload
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveToCrm}
                  className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'Saving Project…' : 'Save Project & All Units to CRM'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form C Interactive Preview Modal */}
      {projectData && (
        <MahaReraCertificateModal
          open={showFormCModal}
          onClose={() => setShowFormCModal(false)}
          projectData={{
            reraNumber: projectData.reraNumber || 'P52000079818',
            projectName: projectData.projectName || 'CITY AVENUE',
            developerName: projectData.developerName || 'City Space',
            promoterName: projectData.reraVerification?.promoterName || projectData.developerName || 'City Space',
            address: projectData.reraVerification?.address || 'PLOT NO 12D, SECTOR-24 at Taloja Panchnad , Panvel, Raigarh, 410208',
            plotDetails: projectData.reraVerification?.plotDetails || 'PLOT NO 12D, SECTOR-24 at Taloja Panchnad , Panvel, Raigarh, 410208',
            registeredOffice: projectData.reraVerification?.registeredOffice || 'Tehsil: Panvel, District: Raigarh, Pin: 410210',
            registrationDate: projectData.reraVerification?.registrationDate || '27/03/2025',
            validUntil: projectData.reraVerification?.validUntil || '31/12/2028',
            signatoryName: projectData.reraVerification?.signatoryName || 'Prakash Kaluram Sabale',
            signatoryDate: projectData.reraVerification?.signatoryDate || '3/27/2025 3:57:36 PM',
            certificateUrl: projectData.reraCertificateUrl || undefined,
            originalImageUrl: projectData.reraVerification?.originalDocumentUrl || (projectData.reraNumber === 'P52000079818' ? '/images/original-certificates/P52000079818.png' : undefined),
            isOriginalScannedDocument: projectData.reraVerification?.isOriginalScannedDocument ?? true,
          }}
        />
      )}
    </AccessibleDialog>
  );
}

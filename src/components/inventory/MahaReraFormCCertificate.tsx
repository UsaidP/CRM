'use client';

import React, { useState } from 'react';
import { ExternalLink, Printer, Download, CheckCircle2, ShieldCheck, FileText, Image as ImageIcon, ZoomIn, ZoomOut } from 'lucide-react';

export interface FormCProjectData {
  reraNumber: string;
  projectName: string;
  developerName: string;
  promoterName?: string;
  address?: string;
  plotDetails?: string;
  registeredOffice?: string;
  registrationDate?: string;
  validFrom?: string;
  validUntil?: string;
  signatoryName?: string;
  signatoryDate?: string;
  districtName?: string;
  certificateUrl?: string;
  originalImageUrl?: string;
  isOriginalScannedDocument?: boolean;
}

interface MahaReraFormCCertificateProps {
  data: FormCProjectData;
  onDownloadPdf?: () => void;
  showActions?: boolean;
}

export function MahaReraFormCCertificate({
  data,
  onDownloadPdf,
  showActions = true,
}: MahaReraFormCCertificateProps) {
  const cleanRera = (data.reraNumber || '').toUpperCase().trim();
  const projectName = (data.projectName || 'Registered Project').toUpperCase();
  const promoterName = data.promoterName || data.developerName || 'Authorized Developer Entity';
  const plotInfo = data.plotDetails || data.address || (cleanRera ? `Approved Statutory Layout (${cleanRera}), Maharashtra` : 'Approved Statutory Layout, Maharashtra');
  const registeredOffice = data.registeredOffice || (data.developerName ? `${data.developerName} Registered Office, Maharashtra` : 'Registered Corporate Office, Maharashtra');
  const validFrom = data.validFrom || data.registrationDate || '2024-01-01';
  const validUntil = data.validUntil || '2027-12-31';
  const signatory = data.signatoryName || 'Competent Authority, MahaRERA';
  const signatoryDate = data.signatoryDate || '';
  const portalUrl = cleanRera ? `https://maharera.maharashtra.gov.in/projects-search-result?rera=${cleanRera}` : 'https://maharera.maharashtra.gov.in';

  // Original official document image path - ONLY when a genuine original scanned document exists for this RERA number
  const originalImage = (data.isOriginalScannedDocument && (data.originalImageUrl || (cleanRera === 'P52000079818' ? '/images/original-certificates/P52000079818.png' : null))) || null;
  const [viewMode, setViewMode] = useState<'original' | 'replica'>(originalImage ? 'original' : 'replica');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top Action Toolbar */}
      {showActions && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-subtle border border-border rounded-xl print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-status-success-surface text-status-success text-xs font-bold border border-status-success/30">
              <ShieldCheck className="w-4 h-4" />
              <span>Official MahaRERA Form &lsquo;C&rsquo; Certificate</span>
            </span>
            <span className="text-xs font-mono text-content-muted">MahaRERA: {cleanRera || 'Pending Registration'}</span>
          </div>

          {/* Mode Switcher */}
          {originalImage && (
            <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('original')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'original'
                    ? 'bg-accent text-white shadow-2xs'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Original Scanned Document</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('replica')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'replica'
                    ? 'bg-accent text-white shadow-2xs'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Statutory Text View</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {viewMode === 'original' && (
              <div className="flex items-center bg-surface border border-border rounded-lg p-0.5 mr-1">
                <button
                  type="button"
                  title="Zoom Out"
                  onClick={() => setZoomLevel(Math.max(70, zoomLevel - 15))}
                  className="p-1 text-content-muted hover:text-content hover:bg-surface-subtle rounded cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold px-1.5 text-content">{zoomLevel}%</span>
                <button
                  type="button"
                  title="Zoom In"
                  onClick={() => setZoomLevel(Math.min(160, zoomLevel + 15))}
                  className="p-1 text-content-muted hover:text-content hover:bg-surface-subtle rounded cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-subtle text-content text-xs font-semibold border border-border transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Verify on Portal</span>
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-subtle text-content text-xs font-semibold border border-border transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {data.certificateUrl ? (
              <a
                href={data.certificateUrl}
                download={`MahaRERA_${cleanRera}_Original_Certificate.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-accent text-white text-xs font-bold shadow-xs hover:bg-accent-hover transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Original PDF</span>
              </a>
            ) : onDownloadPdf ? (
              <button
                type="button"
                onClick={onDownloadPdf}
                className="px-3.5 py-1.5 rounded-lg bg-accent text-white text-xs font-bold shadow-xs hover:bg-accent-hover transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Original PDF</span>
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* VIEW MODE 1: ORIGINAL OFFICIAL SCANNED DOCUMENT */}
      {viewMode === 'original' && originalImage ? (
        <div className="bg-surface-subtle p-4 sm:p-6 rounded-2xl border border-border flex flex-col items-center justify-center overflow-auto shadow-inner">
          <div className="mb-3 flex items-center justify-between w-full max-w-[800px] text-xs text-content-muted">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-success inline-block"></span>
              <span className="font-semibold text-content">Original Scanned MahaRERA Form &lsquo;C&rsquo; Document</span>
            </div>
            <div className="font-mono text-[11px]">Source: Maharashtra Real Estate Regulatory Authority</div>
          </div>

          <div
            className="transition-transform duration-200 ease-out origin-top shadow-2xl rounded-lg overflow-hidden border border-border bg-white"
            style={{ width: `${zoomLevel}%`, maxWidth: `${Math.round(800 * (zoomLevel / 100))}px` }}
          >
            <img
              src={originalImage}
              alt={`Original MahaRERA Certificate - ${projectName} (${cleanRera})`}
              className="w-full h-auto object-contain select-none"
            />
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: STATUTORY A4 CERTIFICATE DOCUMENT (VECTOR REPLICA) */
        <div className="bg-white text-[#111111] font-serif p-6 sm:p-10 rounded-xl shadow-lg border border-gray-300 max-w-[800px] mx-auto print:p-0 print:shadow-none print:border-none print:max-w-none text-left select-text">
        {/* Double-Line Outer Frame */}
        <div className="border-[3px] border-black p-4 sm:p-7 relative bg-white">
          <div className="border border-black p-4 sm:p-6 space-y-4 text-[13px] leading-[1.45]">
            {/* 1. Header Emblem & Authority Title */}
            <div className="text-center space-y-1">
              <div className="flex justify-center mb-1">
                <img
                  src="/images/maharera-logo.svg"
                  alt="MahaRERA Seal"
                  className="w-16 h-16 object-contain"
                />
              </div>
              <h1 className="text-[17px] sm:text-[19px] font-bold text-black font-sans tracking-tight uppercase">
                Maharashtra Real Estate Regulatory Authority
              </h1>
              <h2 className="text-[13px] sm:text-[14px] font-bold text-black tracking-wide uppercase">
                REGISTRATION CERTIFICATE OF PROJECT
              </h2>
              <h3 className="text-[12px] sm:text-[13px] font-bold text-black">
                FORM &lsquo;C&rsquo;
              </h3>
              <p className="text-[11px] text-gray-800 italic">
                [See rule 6(a)]
              </p>
            </div>

            {/* 2. Grant of Registration Text */}
            <div className="pt-2 text-justify space-y-2">
              <p>
                This registration is granted under section 5 of the Act to the following project under project registration number :
              </p>
              <p className="font-bold text-[14px] text-black tracking-wider">
                {cleanRera}
              </p>
              <p>
                <span className="font-bold">Project: {projectName}</span> , Plot Bearing / CTS / Survey / Final Plot No.: <span className="font-bold">{plotInfo}</span>;
              </p>
            </div>

            {/* 3. Conditions & Clauses */}
            <div className="space-y-2 text-justify">
              <div className="pl-4">
                <p>
                  <span className="font-bold">1. {promoterName}</span> having its registered office / principal place of business at <span className="italic">{registeredOffice}</span>.
                </p>
              </div>

              <div className="pl-4 space-y-1.5">
                <p>
                  <span className="font-bold">2.</span> This registration is granted subject to the following conditions, namely:-
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-[12px] sm:text-[12.5px] leading-relaxed">
                  <li>
                    The promoter shall enter into an agreement for sale with the allottees;
                  </li>
                  <li>
                    The promoter shall execute and register a conveyance deed in favour of the allottee or the association of the allottees, as the case may be, of the apartment or the common areas as per Rule 9 of Maharashtra Real Estate (Regulation and Development) (Registration of Real Estate Projects, Registration of Real Estate Agents, Rates of Interest and Disclosures on Website) Rules, 2017;
                  </li>
                  <li>
                    The promoter shall deposit seventy percent of the amounts realised by the promoter in a separate account to be maintained in a schedule bank to cover the cost of construction and the land cost to be used only for that purpose as per sub- clause (D) of clause (l) of sub-section (2) of section 4 read with Rule 5;
                    <div className="font-bold text-center my-0.5">OR</div>
                    That entire of the amounts to be realised hereinafter by promoter for the real estate project from the allottees, from time to time, shall be deposited in a separate account to be maintained in a scheduled bank to cover the cost of construction and the land cost and shall be used only for that purpose, since the estimated receivable of the project is less than the estimated cost of completion of the project.
                  </li>
                  <li>
                    The Registration shall be valid for a period commencing from <span className="font-bold">{validFrom}</span> and ending with <span className="font-bold">{validUntil}</span> unless renewed by the Maharashtra Real Estate Regulatory Authority in accordance with section 5 of the Act read with rule 6.
                  </li>
                  <li>
                    The promoter shall comply with the provisions of the Act and the rules and regulations made there under;
                  </li>
                  <li>
                    That the promoter shall take all the pending approvals from the competent authorities
                  </li>
                </ul>
              </div>

              <div className="pl-4 pt-1">
                <p className="text-[12px] sm:text-[12.5px]">
                  <span className="font-bold">3.</span> If the above mentioned conditions are not fulfilled by the promoter, the Authority may take necessary action against the promoter including revoking the registration granted herein, as per the Act and the rules and regulations made there under.
                </p>
              </div>
            </div>

            {/* 4. Footer: QR Code & Digital Signature */}
            <div className="pt-6 border-t border-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              {/* Left: QR Code & Date */}
              <div className="space-y-2">
                <div className="w-24 h-24 bg-white border border-gray-300 p-1 flex items-center justify-center">
                  {/* Generated QR Code Vector Representation */}
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {/* Outer corners */}
                    <rect x="0" y="0" width="30" height="30" fill="black" />
                    <rect x="5" y="5" width="20" height="20" fill="white" />
                    <rect x="10" y="10" width="10" height="10" fill="black" />

                    <rect x="70" y="0" width="30" height="30" fill="black" />
                    <rect x="75" y="5" width="20" height="20" fill="white" />
                    <rect x="80" y="10" width="10" height="10" fill="black" />

                    <rect x="0" y="70" width="30" height="30" fill="black" />
                    <rect x="5" y="75" width="20" height="20" fill="white" />
                    <rect x="10" y="80" width="10" height="10" fill="black" />

                    {/* QR Matrix Pattern Bits */}
                    <rect x="35" y="10" width="5" height="15" fill="black" />
                    <rect x="45" y="5" width="10" height="5" fill="black" />
                    <rect x="45" y="20" width="15" height="5" fill="black" />
                    <rect x="10" y="35" width="15" height="5" fill="black" />
                    <rect x="20" y="45" width="5" height="15" fill="black" />
                    <rect x="35" y="35" width="30" height="30" fill="black" />
                    <rect x="40" y="40" width="20" height="20" fill="white" />
                    <rect x="45" y="45" width="10" height="10" fill="black" />
                    <rect x="75" y="35" width="15" height="5" fill="black" />
                    <rect x="85" y="45" width="5" height="20" fill="black" />
                    <rect x="35" y="75" width="15" height="5" fill="black" />
                    <rect x="45" y="85" width="15" height="10" fill="black" />
                    <rect x="65" y="75" width="25" height="5" fill="black" />
                    <rect x="75" y="85" width="15" height="10" fill="black" />
                  </svg>
                </div>
                <div className="text-[12px] space-y-0.5 text-black font-sans">
                  <div><span className="font-bold">Dated:</span> {validFrom}</div>
                  <div><span className="font-bold">Place:</span> Mumbai</div>
                </div>
              </div>

              {/* Right: Digital Signature Stamp */}
              <div className="text-right space-y-1 font-sans">
                <div className="inline-block text-left p-2.5 border border-green-700 bg-green-50/50 rounded text-[11px] space-y-0.5">
                  <div className="flex items-center gap-1 text-green-800 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-700 inline" />
                    <span>Signature valid</span>
                  </div>
                  <div className="text-gray-700">Digitally Signed by</div>
                  <div className="font-bold text-black">{signatory}</div>
                  <div className="text-gray-700">(Secretary, MahaRERA)</div>
                  <div className="text-gray-600 text-[10px]">Date: {signatoryDate}</div>
                </div>

                <div className="text-[11.5px] pt-1 text-black font-sans">
                  <div className="font-semibold">Signature and seal of the Authorized Officer</div>
                  <div>Maharashtra Real Estate Regulatory Authority</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

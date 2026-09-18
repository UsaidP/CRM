import fs from 'fs';
import path from 'path';

interface Element {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: string;
  strokeWidth?: number;
  strokeStyle?: string;
  roughness?: number;
  opacity?: number;
  groupIds?: string[];
  roundness?: { type: number } | null;
  seed?: number;
  version?: number;
  versionNonce?: number;
  isDeleted?: boolean;
  boundElements?: { id: string; type: string }[];
  index?: string;
  frameId?: string | null;
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: string;
  verticalAlign?: string;
  containerId?: string | null;
  originalText?: string;
  autoResize?: boolean;
  lineHeight?: number;
  points?: [number, number][];
  startBinding?: any;
  endBinding?: any;
  startArrowhead?: string | null;
  endArrowhead?: string | null;
  [key: string]: any;
}

const elements: Element[] = [];
let seedCounter = 1000;
let indexCounter = 1;

function getIndex() {
  return 'a' + (indexCounter++).toString(36);
}

function addTitle() {
  // Main title
  elements.push({
    id: 'title-main',
    type: 'text',
    x: 60,
    y: 40,
    width: 820,
    height: 38,
    strokeColor: '#0f172a',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    text: 'ZamZam CRM — Multi-Tenant Lead Assignment Architecture',
    fontSize: 24,
    fontFamily: 1,
    textAlign: 'left',
    verticalAlign: 'top',
    version: 1,
    versionNonce: ++seedCounter,
    isDeleted: false,
    seed: ++seedCounter,
    index: getIndex(),
    containerId: null,
    originalText: 'ZamZam CRM — Multi-Tenant Lead Assignment Architecture',
    autoResize: true,
    lineHeight: 1.3,
  });

  // Subtitle
  elements.push({
    id: 'title-subtitle',
    type: 'text',
    x: 60,
    y: 82,
    width: 950,
    height: 24,
    strokeColor: '#64748b',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    text: 'Zero Cross-Tenant Leakage • Automated Telecaller Distribution • Transactional Audit Trail • RBAC Scope Isolation',
    fontSize: 14,
    fontFamily: 1,
    textAlign: 'left',
    verticalAlign: 'top',
    version: 1,
    versionNonce: ++seedCounter,
    isDeleted: false,
    seed: ++seedCounter,
    index: getIndex(),
    containerId: null,
    originalText: 'Zero Cross-Tenant Leakage • Automated Telecaller Distribution • Transactional Audit Trail • RBAC Scope Isolation',
    autoResize: true,
    lineHeight: 1.2,
  });
}

function addCard(options: {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  content: string;
  stroke: string;
  bg: string;
  boundElements?: { id: string; type: string }[];
}) {
  const textId = `text-${options.id}`;
  const bound = options.boundElements || [];
  bound.push({ id: textId, type: 'text' });

  // Rectangle
  elements.push({
    id: options.id,
    type: 'rectangle',
    x: options.x,
    y: options.y,
    width: options.w,
    height: options.h,
    angle: 0,
    strokeColor: options.stroke,
    backgroundColor: options.bg,
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    roundness: { type: 3 },
    seed: ++seedCounter,
    version: 1,
    versionNonce: ++seedCounter,
    isDeleted: false,
    boundElements: bound,
    index: getIndex(),
    frameId: null,
    link: null,
    locked: false,
  });

  const fullText = `${options.title}\n\n${options.content}`;

  // Text
  elements.push({
    id: textId,
    type: 'text',
    x: options.x + 12,
    y: options.y + 12,
    width: options.w - 24,
    height: options.h - 24,
    angle: 0,
    strokeColor: options.stroke,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    text: fullText,
    fontSize: 13,
    fontFamily: 1,
    textAlign: 'left',
    verticalAlign: 'top',
    containerId: options.id,
    version: 1,
    versionNonce: ++seedCounter,
    index: getIndex(),
    isDeleted: false,
    seed: ++seedCounter,
    frameId: null,
    roundness: null,
    boundElements: [],
    originalText: fullText,
    autoResize: false,
    lineHeight: 1.35,
  });
}

function addStageFrame(options: {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  stroke: string;
  bg: string;
}) {
  elements.push({
    id: options.id,
    type: 'rectangle',
    x: options.x,
    y: options.y,
    width: options.w,
    height: options.h,
    angle: 0,
    strokeColor: options.stroke,
    backgroundColor: options.bg,
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'dashed',
    roughness: 0,
    opacity: 60,
    groupIds: [],
    roundness: { type: 3 },
    seed: ++seedCounter,
    version: 1,
    versionNonce: ++seedCounter,
    isDeleted: false,
    boundElements: [],
    index: getIndex(),
    frameId: null,
    locked: false,
  });

  elements.push({
    id: `label-${options.id}`,
    type: 'text',
    x: options.x + 14,
    y: options.y + 10,
    width: options.w - 28,
    height: 22,
    strokeColor: options.stroke,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    text: options.label,
    fontSize: 13,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'top',
    version: 1,
    versionNonce: ++seedCounter,
    index: getIndex(),
    isDeleted: false,
    seed: ++seedCounter,
    containerId: null,
    originalText: options.label,
    autoResize: true,
    lineHeight: 1.2,
  });
}

function addArrow(options: {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  fromId: string;
  toId: string;
  label?: string;
  stroke?: string;
}) {
  const dx = options.endX - options.startX;
  const dy = options.endY - options.startY;
  const stroke = options.stroke || '#475569';

  elements.push({
    id: options.id,
    type: 'arrow',
    x: options.startX,
    y: options.startY,
    width: Math.abs(dx),
    height: Math.abs(dy),
    angle: 0,
    strokeColor: stroke,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    points: [
      [0, 0],
      [dx, dy],
    ],
    startBinding: {
      elementId: options.fromId,
      focus: 0,
      gap: 6,
    },
    endBinding: {
      elementId: options.toId,
      focus: 0,
      gap: 6,
    },
    endArrowhead: 'arrow',
    version: 1,
    versionNonce: ++seedCounter,
    index: getIndex(),
    isDeleted: false,
    seed: ++seedCounter,
    boundElements: [],
    locked: false,
  });

  if (options.label) {
    const midX = options.startX + dx / 2 - 40;
    const midY = options.startY + dy / 2 - 16;
    elements.push({
      id: `label-${options.id}`,
      type: 'text',
      x: midX,
      y: midY,
      width: 100,
      height: 18,
      strokeColor: stroke,
      backgroundColor: '#ffffff',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      text: options.label,
      fontSize: 11,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      version: 1,
      versionNonce: ++seedCounter,
      index: getIndex(),
      isDeleted: false,
      seed: ++seedCounter,
      containerId: null,
      originalText: options.label,
      autoResize: true,
      lineHeight: 1.2,
    });
  }
}

// 1. Setup Header
addTitle();

// Column layout parameters
const colWidth = 270;
const gap = 45;
const startX = 60;
const startY = 140;
const colH = 590;

const c1X = startX;
const c2X = c1X + colWidth + gap;
const c3X = c2X + colWidth + gap;
const c4X = c3X + colWidth + gap;
const c5X = c4X + colWidth + gap;

// Stage 1: INBOUND INGESTION
addStageFrame({
  id: 'frame-stage-1',
  x: c1X - 10,
  y: startY,
  w: colWidth + 20,
  h: colH,
  label: 'STAGE 1: INGESTION CHANNELS',
  stroke: '#2563eb',
  bg: '#f8fafc',
});

addCard({
  id: 'card-inbound-sources',
  x: c1X,
  y: startY + 45,
  w: colWidth,
  h: 155,
  title: '📥 Inbound Entry Points',
  content: '• Webhook / Telephony Call\n• WhatsApp / Instagram Webhook\n• CSV Bulk Lead Import\n• Manual Agent / Admin Form\n• Inbound DID Phone Numbers',
  stroke: '#1e40af',
  bg: '#dbeafe',
});

addCard({
  id: 'card-pre-processing',
  x: c1X,
  y: startY + 245,
  w: colWidth,
  h: 165,
  title: '⚙️ Pipeline Pre-Processing',
  content: '• normalizeIndianPhone() → E.164\n• Campaign attribution matching\n• findOrCreateContact() dedupe\n• Channel metadata enrichment\n• Validates caller payload schema',
  stroke: '#1d4ed8',
  bg: '#eff6ff',
});

// Stage 2: MULTI-TENANT ISOLATION BOUNDARY
addStageFrame({
  id: 'frame-stage-2',
  x: c2X - 10,
  y: startY,
  w: colWidth + 20,
  h: colH,
  label: 'STAGE 2: TENANT BOUNDARY',
  stroke: '#7c3aed',
  bg: '#faf5ff',
});

addCard({
  id: 'card-org-resolver',
  x: c2X,
  y: startY + 45,
  w: colWidth,
  h: 155,
  title: '🏢 Org Context Resolver',
  content: '• requireSession() extract orgId\n• Webhook DID / Token resolver\n• Fails CLOSED if ambiguous\n• Validates active subscription\n• Prevents cross-tenant bleed',
  stroke: '#6d28d9',
  bg: '#ede9fe',
});

addCard({
  id: 'card-tenant-guard',
  x: c2X,
  y: startY + 245,
  w: colWidth,
  h: 165,
  title: '🛡️ Prisma Tenant Guard',
  content: '• bindTenant() via AsyncLocalStorage\n• Auto-injects { organizationId }\n• Blocks cross-org mutations\n• Throws FORBIDDEN_CROSS_TENANT\n• 100% Cryptographic isolation',
  stroke: '#5b21b6',
  bg: '#f5f3ff',
});

// Stage 3: ASSIGNMENT ENGINE
addStageFrame({
  id: 'frame-stage-3',
  x: c3X - 10,
  y: startY,
  w: colWidth + 20,
  h: colH,
  label: 'STAGE 3: ASSIGNMENT ROUTER',
  stroke: '#059669',
  bg: '#f0fdf4',
});

addCard({
  id: 'card-routing-hierarchy',
  x: c3X,
  y: startY + 45,
  w: colWidth,
  h: 180,
  title: '🎯 Routing Decision Rules',
  content: '1. Explicit requestedBrokerId\n2. Telecaller Self-Assign (creator)\n3. Inbound Line DID (e.g. Safwan)\n4. Team Desk / Round-Robin\n5. Default Unassigned Pool\n(Checked against tenant users)',
  stroke: '#047857',
  bg: '#d1fae5',
});

addCard({
  id: 'card-assignment-modes',
  x: c3X,
  y: startY + 265,
  w: colWidth,
  h: 155,
  title: '🔄 Assignment Types',
  content: '• DIRECT: Explicit line or broker\n• ROUND_ROBIN: Team load balance\n• MANUAL_REASSIGN: Manager shift\n• ESCALATION: Unanswered SLA\n(Enum: AssignmentType)',
  stroke: '#065f46',
  bg: '#ecfdf5',
});

// Stage 4: DUAL-STATE PERSISTENCE
addStageFrame({
  id: 'frame-stage-4',
  x: c4X - 10,
  y: startY,
  w: colWidth + 20,
  h: colH,
  label: 'STAGE 4: ATOMIC PERSISTENCE',
  stroke: '#d97706',
  bg: '#fffbeb',
});

addCard({
  id: 'card-audit-trail',
  x: c4X,
  y: startY + 45,
  w: colWidth,
  h: 165,
  title: '📜 LeadAssignment Table',
  content: '• Close prev: unassignedAt = now()\n• Insert new assignment row\n• Records assignedById & type\n• Preserves full historical audit\n• Timestamped handoff logs',
  stroke: '#b45309',
  bg: '#fef3c7',
});

addCard({
  id: 'card-denormalized-lead',
  x: c4X,
  y: startY + 250,
  w: colWidth,
  h: 160,
  title: '⚡ Fast Denormalized Pointer',
  content: '• Lead.assignedBrokerId = userId\n• Indexed for sub-10ms queries\n• Drives telecaller dashboard\n• Executed in Prisma $transaction\n• Atomic rollback on failure',
  stroke: '#92400e',
  bg: '#fff7ed',
});

// Stage 5: RBAC & SLA
addStageFrame({
  id: 'frame-stage-5',
  x: c5X - 10,
  y: startY,
  w: colWidth + 20,
  h: colH,
  label: 'STAGE 5: RBAC & SLA ACTIONS',
  stroke: '#e11d48',
  bg: '#fff1f2',
});

addCard({
  id: 'card-rbac-scopes',
  x: c5X,
  y: startY + 45,
  w: colWidth,
  h: 165,
  title: '👁️ RBAC Visibility Scopes',
  content: '• AGENT: OWN + ASSIGNED\n• MANAGER: Assigned Team Desk\n• ADMIN: Entire Tenant Org\n• SUPER_ADMIN: Global Platform\nEnforced at API & query level',
  stroke: '#be123c',
  bg: '#ffe4e6',
});

addCard({
  id: 'card-speed-to-lead',
  x: c5X,
  y: startY + 250,
  w: colWidth,
  h: 160,
  title: '⏱️ Speed-to-Lead & SLA',
  content: '• ensureLeadFallbackReminder()\n• 15-Minute first response clock\n• Push notification to assigned rep\n• Auto-escalate if uncontacted\n• Manager dashboard alert',
  stroke: '#9f1239',
  bg: '#fff1f2',
});

// Horizontal workflow connecting arrows
addArrow({
  id: 'arr-1-to-pre',
  startX: c1X + colWidth / 2,
  startY: startY + 200,
  endX: c1X + colWidth / 2,
  endY: startY + 245,
  fromId: 'card-inbound-sources',
  toId: 'card-pre-processing',
  stroke: '#2563eb',
});

addArrow({
  id: 'arr-pre-to-org',
  startX: c1X + colWidth,
  startY: startY + 310,
  endX: c2X,
  endY: startY + 120,
  fromId: 'card-pre-processing',
  toId: 'card-org-resolver',
  label: 'tenant scope',
  stroke: '#4f46e5',
});

addArrow({
  id: 'arr-org-to-guard',
  startX: c2X + colWidth / 2,
  startY: startY + 200,
  endX: c2X + colWidth / 2,
  endY: startY + 245,
  fromId: 'card-org-resolver',
  toId: 'card-tenant-guard',
  stroke: '#7c3aed',
});

addArrow({
  id: 'arr-guard-to-router',
  startX: c2X + colWidth,
  startY: startY + 310,
  endX: c3X,
  endY: startY + 130,
  fromId: 'card-tenant-guard',
  toId: 'card-routing-hierarchy',
  label: 'isolated lead',
  stroke: '#059669',
});

addArrow({
  id: 'arr-router-to-types',
  startX: c3X + colWidth / 2,
  startY: startY + 225,
  endX: c3X + colWidth / 2,
  endY: startY + 265,
  fromId: 'card-routing-hierarchy',
  toId: 'card-assignment-modes',
  stroke: '#059669',
});

addArrow({
  id: 'arr-router-to-audit',
  startX: c3X + colWidth,
  startY: startY + 130,
  endX: c4X,
  endY: startY + 120,
  fromId: 'card-routing-hierarchy',
  toId: 'card-audit-trail',
  label: 'assignLead()',
  stroke: '#d97706',
});

addArrow({
  id: 'arr-audit-to-denorm',
  startX: c4X + colWidth / 2,
  startY: startY + 210,
  endX: c4X + colWidth / 2,
  endY: startY + 250,
  fromId: 'card-audit-trail',
  toId: 'card-denormalized-lead',
  label: '$transaction',
  stroke: '#b45309',
});

addArrow({
  id: 'arr-audit-to-rbac',
  startX: c4X + colWidth,
  startY: startY + 120,
  endX: c5X,
  endY: startY + 120,
  fromId: 'card-audit-trail',
  toId: 'card-rbac-scopes',
  label: 'scoped filter',
  stroke: '#e11d48',
});

addArrow({
  id: 'arr-denorm-to-sla',
  startX: c4X + colWidth,
  startY: startY + 325,
  endX: c5X,
  endY: startY + 325,
  fromId: 'card-denormalized-lead',
  toId: 'card-speed-to-lead',
  label: 'start SLA',
  stroke: '#e11d48',
});

const excalidrawDoc = {
  type: 'excalidraw',
  version: 2,
  source: 'https://excalidraw.com',
  elements,
  appState: {
    gridSize: 20,
    gridStep: 5,
    gridModeEnabled: false,
    viewBackgroundColor: '#ffffff',
  },
  files: {},
};

const outputPath = path.resolve('/Users/usaidpatel/Desktop/CRM/multi-tenant-lead-assignment.excalidraw');
fs.writeFileSync(outputPath, JSON.stringify(excalidrawDoc, null, 2));
console.log(`Generated ${outputPath} with ${elements.length} elements.`);

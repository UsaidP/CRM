'use client';

import { gooeyToast } from 'goey-toast';
import type { ReactNode } from 'react';

/**
 * GooeyToast options interface re-exported and extended for ZamZam Real Estate CRM.
 */
export interface ToastAction {
  label: string;
  onClick: () => void;
  successLabel?: string;
}

export interface ToastOptions {
  description?: ReactNode;
  action?: ToastAction;
  icon?: ReactNode;
  duration?: number;
  id?: string | number;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  bounce?: number;
  showTimestamp?: boolean;
  showProgress?: boolean;
  onDismiss?: (id: string | number) => void;
  onAutoClose?: (id: string | number) => void;
  preset?: 'smooth' | 'bouncy' | 'subtle' | 'snappy';
}

export interface PromiseToastMessages<T> {
  loading: string | { title: string; description?: ReactNode };
  success: string | { title: string; description?: ReactNode } | ((data: T) => string | { title: string; description?: ReactNode });
  error: string | { title: string; description?: ReactNode } | ((error: unknown) => string | { title: string; description?: ReactNode });
}

/**
 * Base Toast Dispatcher
 */
function baseToast(title: string, options?: ToastOptions) {
  return gooeyToast(title, options as any);
}

baseToast.success = (title: string, options?: ToastOptions) => {
  return gooeyToast.success(title, options as any);
};

baseToast.error = (title: string, options?: ToastOptions) => {
  return gooeyToast.error(title, options as any);
};

baseToast.warning = (title: string, options?: ToastOptions) => {
  return gooeyToast.warning(title, options as any);
};

baseToast.info = (title: string, options?: ToastOptions) => {
  return gooeyToast.info(title, options as any);
};

baseToast.promise = <T>(
  promise: Promise<T> | (() => Promise<T>),
  data: PromiseToastMessages<T>
) => {
  const resolvedPromise = typeof promise === 'function' ? (promise as () => Promise<T>)() : promise;
  return gooeyToast.promise(resolvedPromise, data as any);
};

baseToast.update = (id: string | number, options: Record<string, unknown>) => {
  return gooeyToast.update(id, options as any);
};

baseToast.dismiss = (idOrFilter?: string | number | { type?: string | string[] }) => {
  return gooeyToast.dismiss(idOrFilter as any);
};

/**
 * Real Estate CRM Domain Presets
 */

/**
 * 1. Telecaller Lead Disposition Preset (with Instant Undo callback)
 */
baseToast.leadDisposition = (leadName?: string | null, stageLabel?: string, onUndo?: () => void) => {
  const safeName = leadName?.trim() || 'Lead';
  const safeStage = stageLabel || 'Updated';
  return gooeyToast.success(`Disposition Saved: ${safeName}`, {
    description: `Lead moved to "${safeStage}"`,
    duration: 5000,
    preset: 'snappy',
    action: onUndo
      ? {
          label: 'Undo',
          successLabel: 'Reverted',
          onClick: onUndo,
        }
      : undefined,
  } as any);
};

/**
 * 2. MahaRERA Verification Status Preset
 */
baseToast.reraVerified = (projectName?: string | null, reraNumber?: string | null) => {
  const safeName = projectName?.trim() || 'Project';
  const safeRera = reraNumber?.trim() || 'MahaRERA Registered';
  return gooeyToast.success(`MahaRERA Verified`, {
    description: `${safeName} (${safeRera}) is officially active & marketable.`,
    duration: 4500,
  } as any);
};

/**
 * 3. Client Presentation Portal Generated / Copied
 */
baseToast.portalCopied = (clientName?: string | null) => {
  const safeName = clientName?.trim() || 'Client';
  return gooeyToast.info(`Client Portal Link Ready`, {
    description: `Private tokenized presentation for ${safeName} copied to clipboard. Dwell telemetry active.`,
    duration: 4000,
  } as any);
};

/**
 * 4. WhatsApp Site Visit Itinerary Dispatched
 */
baseToast.itineraryDispatched = (clientName?: string | null, projectCount: number = 1) => {
  const safeName = clientName?.trim() || 'Client';
  return gooeyToast.success(`Site Visit Itinerary Ready`, {
    description: `WhatsApp tour itinerary generated for ${safeName} covering ${projectCount} project${projectCount > 1 ? 's' : ''}.`,
    duration: 4500,
  } as any);
};

/**
 * 5. Deal Commission Won / Closed
 */
baseToast.dealClosed = (clientName?: string | null, brokerageFormatted?: string | null) => {
  const safeName = clientName?.trim() || 'Client';
  const safeAmount = brokerageFormatted || 'Commission';
  return gooeyToast.success(`Deal Closed & Won!`, {
    description: `Booking confirmed for ${safeName}. Attributed Brokerage: ${safeAmount}.`,
    duration: 6000,
    preset: 'bouncy',
    bounce: 0.45,
  } as any);
};

/**
 * 6. Cloud Backup Completion
 */
baseToast.backupComplete = (recordCount: number) => {
  return gooeyToast.success(`Cloud Backup Complete`, {
    description: `Successfully exported ${recordCount} database records to Google Drive archive.`,
    duration: 4000,
  } as any);
};

export const toast = baseToast;
export default toast;

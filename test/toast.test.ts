import { describe, it, expect } from 'bun:test';
import { toast } from '../src/lib/client/toast';

describe('Gooey Toast Notification System & Domain Presets', () => {
  it('exposes core toast dispatch methods', () => {
    expect(typeof toast).toBe('function');
    expect(typeof toast.success).toBe('function');
    expect(typeof toast.error).toBe('function');
    expect(typeof toast.warning).toBe('function');
    expect(typeof toast.info).toBe('function');
    expect(typeof toast.promise).toBe('function');
    expect(typeof toast.update).toBe('function');
    expect(typeof toast.dismiss).toBe('function');
  });

  it('exposes real estate CRM domain presets', () => {
    expect(typeof toast.leadDisposition).toBe('function');
    expect(typeof toast.reraVerified).toBe('function');
    expect(typeof toast.portalCopied).toBe('function');
    expect(typeof toast.itineraryDispatched).toBe('function');
    expect(typeof toast.dealClosed).toBe('function');
    expect(typeof toast.backupComplete).toBe('function');
  });

  it('generates lead disposition toast with undo action structure', () => {
    let undone = false;
    const undoCallback = () => {
      undone = true;
    };

    const toastId = toast.leadDisposition('Rahul Sharma', 'Site Visit Scheduled', undoCallback);
    expect(toastId).toBeDefined();
  });

  it('generates MahaRERA verification toast', () => {
    const toastId = toast.reraVerified('Crown Heights Phase 2', 'P52000079818');
    expect(toastId).toBeDefined();
  });

  it('generates presentation portal copied toast', () => {
    const toastId = toast.portalCopied('Amit Patel');
    expect(toastId).toBeDefined();
  });

  it('generates deal closing celebration toast', () => {
    const toastId = toast.dealClosed('Kiran More', '₹1.75 Lakh');
    expect(toastId).toBeDefined();
  });

  it('generates cloud backup toast', () => {
    const toastId = toast.backupComplete(1250);
    expect(toastId).toBeDefined();
  });
});

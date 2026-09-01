import { describe, expect, test } from 'bun:test';
import {
  toUserMessage,
  getUserErrorMessage,
  USER_SUCCESS_PRESETS,
} from '@/lib/client/user-feedback';

describe('Centralized End-User Feedback & Normalization Engine', () => {
  describe('Technical Error Normalization', () => {
    test('normalizes raw fetch network errors to empathetic user message', () => {
      const msg = toUserMessage(new TypeError('Failed to fetch'));
      expect(msg.title).toBe('Connection Issue');
      expect(msg.description).toContain('internet connection');
      expect(msg.actionLabel).toBe('Retry');
      expect(msg.actionType).toBe('retry');
    });

    test('normalizes ECONNREFUSED network errors', () => {
      const msg = toUserMessage('fetch failed: ECONNREFUSED 127.0.0.1:3000');
      expect(msg.title).toBe('Connection Issue');
      expect(msg.description).toContain('internet connection');
    });

    test('normalizes AbortError / Timeout exceptions', () => {
      const msg = toUserMessage(new Error('The operation was aborted due to timeout'));
      expect(msg.title).toBe('Request Timed Out');
      expect(msg.description).toContain('records remain safe');
    });

    test('normalizes 401 Unauthorized / Session Expired errors', () => {
      const msg = toUserMessage('HTTP 401: Unauthorized jwt expired');
      expect(msg.title).toBe('Session Expired');
      expect(msg.description).toContain('sign in again');
      expect(msg.actionType).toBe('login');
    });

    test('normalizes 403 Forbidden / RBAC permission errors', () => {
      const msg = toUserMessage('HTTP 403: Forbidden - insufficient permissions for this operation');
      expect(msg.title).toBe('Access Restricted');
      expect(msg.description).toContain('permission');
      expect(msg.actionType).toBe('contact_admin');
    });

    test('normalizes 404 Not Found errors', () => {
      const msg = toUserMessage('Error 404: Lead not found or deleted');
      expect(msg.title).toBe('Record Not Found');
      expect(msg.description).toContain('could not be located');
    });

    test('normalizes SQLite UNIQUE constraint and duplicate phone/email errors', () => {
      const msg = toUserMessage('SQLITE_CONSTRAINT: UNIQUE constraint failed: Lead.phoneE164');
      expect(msg.title).toBe('Duplicate Entry');
      expect(msg.description).toContain('already exists');
    });

    test('normalizes WhatsApp dispatch and rate limit errors', () => {
      const msg = toUserMessage('WhatsApp message dispatch failed: rate limit exceeded');
      expect(msg.title).toBe('Communication Dispatch Error');
      expect(msg.description).toContain('country code');
    });

    test('normalizes MahaRERA certificate format errors', () => {
      const msg = toUserMessage('Invalid MahaRERA registration number: P52000000000');
      expect(msg.title).toBe('MahaRERA Validation Notice');
      expect(msg.description).toContain('MahaRERA');
    });

    test('normalizes PDF / Brochure parsing errors', () => {
      const msg = toUserMessage('Failed to parse brochure PDF: unrecognized structure');
      expect(msg.title).toBe('Document Processing Issue');
      expect(msg.description).toContain('PDF');
    });

    test('getUserErrorMessage returns clean string for simple toasts', () => {
      const errStr = getUserErrorMessage(new Error('Failed to fetch'));
      expect(errStr).toContain('internet connection');
      expect(errStr).not.toContain('Failed to fetch');
    });

    test('handles unknown technical stack traces with reassuring fallback', () => {
      const msg = toUserMessage('TypeError: Cannot read properties of undefined (reading "id") at webpack-internal:///./src/components/leads');
      expect(msg.title).toBe('Operation Incomplete');
      expect(msg.description).toContain('Please try again');
    });
  });

  describe('User Success Presets', () => {
    test('provides domain-specific success feedback for leads', () => {
      const leadCreated = USER_SUCCESS_PRESETS.leadCreated('Aarav Mehta');
      expect(leadCreated.title).toBe('Lead Saved');
      expect(leadCreated.description).toContain('Aarav Mehta');

      const leadUpdated = USER_SUCCESS_PRESETS.leadUpdated('Aarav Mehta');
      expect(leadUpdated.title).toBe('Lead Details Updated');
      expect(leadUpdated.description).toContain('Aarav Mehta');

      const stageMoved = USER_SUCCESS_PRESETS.stageMoved('Priya Sharma', 'Site Visit Done');
      expect(stageMoved.title).toBe('Lead Stage Updated');
      expect(stageMoved.description).toContain('Priya Sharma');
      expect(stageMoved.description).toContain('Site Visit Done');

      const callLogged = USER_SUCCESS_PRESETS.callLogged('Priya Sharma');
      expect(callLogged.title).toBe('Call Record Saved');
      expect(callLogged.description).toContain('Priya Sharma');
    });

    test('provides domain-specific success feedback for projects and brochures', () => {
      const projectCreated = USER_SUCCESS_PRESETS.projectCreated('Godrej Palms');
      expect(projectCreated.title).toBe('Project Registered');
      expect(projectCreated.description).toContain('Godrej Palms');

      const brochureParsed = USER_SUCCESS_PRESETS.brochureParsed(12);
      expect(brochureParsed.title).toBe('Brochure Processed');
      expect(brochureParsed.description).toContain('12');
    });

    test('provides domain-specific success feedback for deals and commission', () => {
      const dealCreated = USER_SUCCESS_PRESETS.dealCreated('Rahul Verma');
      expect(dealCreated.title).toBe('Deal Logged');
      expect(dealCreated.description).toContain('Rahul Verma');

      const dealAdvanced = USER_SUCCESS_PRESETS.dealAdvanced('Rahul Verma', 'Agreement Registered');
      expect(dealAdvanced.title).toBe('Deal Advanced');
      expect(dealAdvanced.description).toContain('Agreement Registered');
    });

    test('provides domain-specific success feedback for portals, itineraries, and backups', () => {
      const portalGenerated = USER_SUCCESS_PRESETS.portalGenerated('Zoya Khan');
      expect(portalGenerated.title).toBe('Client Portal Ready');
      expect(portalGenerated.description).toContain('Zoya Khan');

      const itineraryCreated = USER_SUCCESS_PRESETS.itineraryCreated('Vikram Singh', 3);
      expect(itineraryCreated.title).toBe('Site Visit Itinerary Ready');
      expect(itineraryCreated.description).toContain('Vikram Singh');
      expect(itineraryCreated.description).toContain('3');

      const backup = USER_SUCCESS_PRESETS.backupComplete(1420);
      expect(backup.title).toBe('Cloud Backup Complete');
      expect(backup.description).toContain('1420');
    });
  });
});

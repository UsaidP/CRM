/**
 * Call Sync Service — orchestrates the flow when a call ends:
 * 1. Wait for OEM recorder to flush audio file
 * 2. Discover recording via RecordingFinder native module
 * 3. Request upload ticket from CRM
 * 4. Upload audio to Cloudinary/S3
 * 5. Send call event to CRM with recording URL
 */
import { apiClient, type CallEventPayload } from './api-client';
import { findRecentRecording } from '../modules/expo-recording-finder/src';
import { useAppStore, type CallLogEntry } from './store';
import type { CallEvent } from '../modules/expo-call-monitor/src';

/**
 * Process a call event from the native module.
 * This is the main entry point, called when CallStateReceiver emits onCallEvent.
 */
export async function processCallEvent(event: CallEvent): Promise<void> {
  const store = useAppStore.getState();
  const brokerPhone = store.brokerPhone;

  // 1. Add to local call log immediately (or update existing on retry)
  const exists = store.recentCalls.some((c) => c.clientCallId === event.clientCallId);
  if (exists) {
    store.updateCallStatus(event.clientCallId, 'pending');
  } else {
    const entry: CallLogEntry = {
      clientCallId: event.clientCallId,
      phoneNumber: event.phoneNumber,
      direction: event.direction,
      durationSeconds: event.durationSeconds,
      callEndTimeMs: event.callEndTimeMs,
      syncStatus: 'pending',
      timestamp: new Date(event.callEndTimeMs).toISOString(),
    };
    store.addCall(entry);
  }

  if (!brokerPhone) {
    console.warn('[CallSync] Cannot sync call: brokerPhone is not configured');
    store.updateCallStatus(event.clientCallId, 'failed');
    return;
  }

  // 2. Wait for OEM recorder to flush audio file (2.5 seconds, same as Kotlin app)
  await delay(2500);

  // 3. Discover audio recording
  store.updateCallStatus(event.clientCallId, 'syncing');
  let recordingUrl: string | undefined;

  try {
    const filePath = await findRecentRecording(event.callEndTimeMs);

    if (filePath) {
      // 4. Upload audio file
      const ticket = await apiClient.requestUploadTicket();
      if (ticket) {
        const fileName = filePath.split('/').pop() || 'recording.m4a';
        const url = await apiClient.uploadAudioFile(ticket, filePath, fileName);
        if (url) {
          recordingUrl = url;
        }
      }
    }
  } catch (err) {
    console.warn('[CallSync] Recording discovery/upload failed:', err);
  }

  // 5. Send call event to CRM
  const payload: CallEventPayload = {
    callerNumber: event.phoneNumber,
    contactedBrokerNumber: brokerPhone,
    direction: event.direction,
    durationSeconds: event.durationSeconds,
    callRecordingUrl: recordingUrl,
    clientCallId: event.clientCallId,
    callOutcome: event.durationSeconds === 0 ? 'NO_ANSWER' : undefined,
  };

  const success = await apiClient.sendCallEvent(payload);

  if (success) {
    store.updateCallStatus(event.clientCallId, 'synced', recordingUrl);
  } else {
    store.updateCallStatus(event.clientCallId, 'failed');
    // TODO: Queue for retry with expo-task-manager
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

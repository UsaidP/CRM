import { requireOptionalNativeModule } from 'expo-modules-core';

interface ExpoRecordingFinderModule {
  getDetectedOemPath(): string | null;
  findRecentRecording(callEndTimeMs: number): Promise<string | null>;
}

// Safely load the native module (returns null when running in Expo Go or simulator)
const ExpoRecordingFinder: ExpoRecordingFinderModule | null =
  requireOptionalNativeModule('ExpoRecordingFinder');

/**
 * Detect the OEM call recording folder on this device.
 * Returns the path string or null if none found.
 */
export function getDetectedOemPath(): string | null {
  if (!ExpoRecordingFinder) {
    return '/storage/emulated/0/Recordings/Call (Simulation)';
  }
  return ExpoRecordingFinder.getDetectedOemPath();
}

/**
 * Find a recent audio recording matching a call that ended at callEndTimeMs.
 * Searches OEM folders first, then falls back to MediaStore.
 * Returns the absolute file path or null if no recording found.
 */
export async function findRecentRecording(
  callEndTimeMs: number
): Promise<string | null> {
  if (!ExpoRecordingFinder) {
    return null;
  }
  return ExpoRecordingFinder.findRecentRecording(callEndTimeMs);
}

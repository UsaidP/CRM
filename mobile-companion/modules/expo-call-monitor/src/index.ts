import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';
import { PermissionsAndroid, Platform, Linking, Alert } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/** Call event payload emitted by the native module when a call ends */
export interface CallEvent {
  clientCallId: string;
  phoneNumber: string;
  direction: 'INCOMING' | 'OUTGOING' | 'MISSED';
  durationSeconds: number;
  callEndTimeMs: number;
}

/** Device info returned by the native module */
export interface DeviceInfo {
  manufacturer: string;
  model: string;
  sdkVersion: number;
  androidVersion: string;
}

/** Detailed audit of all phone, call log, audio, and battery permissions */
export interface DetailedPermissions {
  phoneState: boolean;
  callLog: boolean;
  callLogPermission?: boolean;
  canQueryCallLog?: boolean;
  notifications: boolean;
  audio: boolean;
  allFiles: boolean;
  batteryUnrestricted: boolean;
  allGranted: boolean;
}

interface ExpoCallMonitorModule {
  startMonitoring(): boolean;
  stopMonitoring(): boolean;
  hasPermissions(): boolean;
  checkDetailedPermissions(): DetailedPermissions;
  openAppSettings(): boolean;
  openAllFilesSettings(): boolean;
  openBatterySettings(): boolean;
  openAccessibilitySettings(): boolean;
  getDeviceInfo(): DeviceInfo;
  addListener(eventName: string, listener: (event: any) => void): EventSubscription;
}

// Safely load the native module (returns null when running in Expo Go or simulator)
const ExpoCallMonitor: ExpoCallMonitorModule | null = requireOptionalNativeModule('ExpoCallMonitor');

/**
 * Detect whether the app is executing inside the public Expo Go sandbox.
 */
export function isExpoGo(): boolean {
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    !ExpoCallMonitor
  );
}

/**
 * Check if the custom native module is available (false in Expo Go).
 */
export function isNativeModuleAvailable(): boolean {
  return ExpoCallMonitor !== null;
}

// In Expo Go or development testing, allow simulating permission state so UI works smoothly
let simulationPermissionsGranted = false;

export function setSimulationPermissionsGranted(granted: boolean): void {
  simulationPermissionsGranted = granted;
}

export function isSimulationPermissionsGranted(): boolean {
  return simulationPermissionsGranted;
}

/**
 * Start the foreground call monitoring service.
 * Shows a persistent notification and listens for SIM call state changes.
 */
export function startMonitoring(): boolean {
  if (!ExpoCallMonitor) {
    console.warn('[ExpoCallMonitor] Native module not loaded (running in Expo Go or non-Android environment). Simulation mode active.');
    return true;
  }
  return ExpoCallMonitor.startMonitoring();
}

/**
 * Stop the foreground call monitoring service.
 */
export function stopMonitoring(): boolean {
  if (!ExpoCallMonitor) {
    return true;
  }
  return ExpoCallMonitor.stopMonitoring();
}

/**
 * Check if telephony permissions (READ_PHONE_STATE, READ_CALL_LOG) are granted.
 */
export function hasPermissions(): boolean {
  if (ExpoCallMonitor) {
    return ExpoCallMonitor.hasPermissions();
  }
  return simulationPermissionsGranted;
}

/**
 * Get device manufacturer/model info (useful for OEM recording path detection).
 */
export function getDeviceInfo(): DeviceInfo {
  if (!ExpoCallMonitor) {
    return {
      manufacturer: 'Simulated',
      model: 'Expo Go / Dev Client',
      sdkVersion: 34,
      androidVersion: 'Android 14 (Simulation)',
    };
  }
  return ExpoCallMonitor.getDeviceInfo();
}

/**
 * Check detailed state of all phone, call log, audio, and battery permissions.
 */
export async function checkDetailedPermissions(): Promise<DetailedPermissions> {
  if (ExpoCallMonitor?.checkDetailedPermissions) {
    try {
      return ExpoCallMonitor.checkDetailedPermissions();
    } catch (e) {
      console.warn('[ExpoCallMonitor] checkDetailedPermissions native error:', e);
    }
  }

  // Fast-path for Expo Go environment
  if (isExpoGo()) {
    return {
      phoneState: simulationPermissionsGranted,
      callLog: simulationPermissionsGranted,
      callLogPermission: simulationPermissionsGranted,
      canQueryCallLog: simulationPermissionsGranted,
      notifications: true,
      audio: true,
      allFiles: true,
      batteryUnrestricted: true,
      allGranted: simulationPermissionsGranted,
    };
  }

  // Cross-platform fallback for standard Android environment
  if (Platform.OS === 'android') {
    try {
      const phoneState = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE);
      const callLog = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
      const notifications =
        Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          ? await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
          : true;
      const audio =
        Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
          ? await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO)
          : await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);

      return {
        phoneState,
        callLog,
        notifications,
        audio,
        allFiles: true,
        batteryUnrestricted: true,
        allGranted: phoneState && callLog,
      };
    } catch {
      // Fallback
    }
  }

  return {
    phoneState: false,
    callLog: false,
    notifications: false,
    audio: false,
    allFiles: false,
    batteryUnrestricted: false,
    allGranted: false,
  };
}

export interface RequestCallLogOptions {
  onSimulateCall?: () => void;
  onEnableSimulation?: () => void;
}

/**
 * Request Call Log permission with rationale and auto-settings prompt fallback.
 */
export async function requestCallLogPermission(
  promptSettingsIfDenied: boolean = true,
  options?: RequestCallLogOptions
): Promise<{ granted: boolean; status: string; isExpoGo?: boolean }> {
  if (Platform.OS !== 'android') return { granted: true, status: 'granted' };

  if (isExpoGo()) {
    if (promptSettingsIfDenied) {
      Alert.alert(
        'Expo Go Limitation (Call Log)',
        'Android blocks the Call Log permission popup in Expo Go because Google Play policy excludes READ_CALL_LOG from the Expo Go manifest.\n\nLikewise, inside Expo Go\'s App Settings, "Call logs" will NOT appear in the permissions list.\n\nOptions:\n• Use Simulation Mode or Simulate Call to test live Lucky CRM sync.\n• Or install the standalone APK for physical SIM tracking.',
        [
          { text: 'Cancel', style: 'cancel' },
          ...(options?.onSimulateCall
            ? [
                {
                  text: 'Simulate Call',
                  onPress: () => options.onSimulateCall?.(),
                },
              ]
            : []),
          {
            text: 'Enable Simulation',
            onPress: () => {
              setSimulationPermissionsGranted(true);
              options?.onEnableSimulation?.();
            },
          },
          {
            text: 'App Settings',
            onPress: () => openAppSettings(),
          },
        ]
      );
    }
    return { granted: simulationPermissionsGranted, status: 'expo_go_restricted', isExpoGo: true };
  }

  try {
    const alreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
    );
    if (alreadyGranted) {
      return { granted: true, status: 'already_granted' };
    }

    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      {
        title: 'Call Log Permission Required',
        message:
          'Lucky Companion requires Call Log permission to record client phone numbers, call direction (incoming/outgoing), and duration for your Lucky CRM dashboard.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );

    const isGranted = status === PermissionsAndroid.RESULTS.GRANTED;

    if (!isGranted && promptSettingsIfDenied) {
      Alert.alert(
        'Call Log Permission Needed',
        'Android requires you to grant Call Log permission in App Settings so Lucky Companion can detect and log client calls:\n\n1. Tap "Open Settings" below\n2. Tap "Permissions"\n3. Tap "Call logs" and choose "Allow"',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openAppSettings() },
        ]
      );
    }

    return { granted: isGranted, status };
  } catch (err) {
    console.warn('[Permissions] Failed to request Call Log permission:', err);
    return { granted: false, status: 'error' };
  }
}

/**
 * Request Phone State permission with rationale.
 */
export async function requestPhoneStatePermission(
  promptSettingsIfDenied: boolean = true
): Promise<{ granted: boolean; status: string; isExpoGo?: boolean }> {
  if (Platform.OS !== 'android') return { granted: true, status: 'granted' };

  if (isExpoGo()) {
    return { granted: simulationPermissionsGranted, status: 'expo_go_restricted', isExpoGo: true };
  }

  try {
    const alreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
    );
    if (alreadyGranted) {
      return { granted: true, status: 'already_granted' };
    }

    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      {
        title: 'Phone State Permission Required',
        message:
          'Lucky Companion needs Phone State access to detect when incoming, outgoing, or missed calls occur on your SIM cards.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );

    const isGranted = status === PermissionsAndroid.RESULTS.GRANTED;

    if (!isGranted && promptSettingsIfDenied) {
      Alert.alert(
        'Phone State Permission Needed',
        'Please enable Phone permission in Android App Settings so Lucky Companion can detect call start and end events.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openAppSettings() },
        ]
      );
    }

    return { granted: isGranted, status };
  } catch (err) {
    console.warn('[Permissions] Failed to request Phone State permission:', err);
    return { granted: false, status: 'error' };
  }
}

/**
 * Request runtime permissions (Phone State, Call Log, Notifications, Audio).
 */
export async function requestRuntimePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  if (isExpoGo()) {
    setSimulationPermissionsGranted(true);
    Alert.alert(
      'Expo Go Simulation Active',
      'Google Play removes Call Log permissions from the Expo Go client app.\n\nSimulation Mode is now active for this session, allowing full testing of Lucky CRM live call logging, client matching, and dashboard sync.'
    );
    return true;
  }

  try {
    // 1. Request Phone State with rationale
    const phoneRes = await requestPhoneStatePermission(false);

    // 2. Request Call Log with rationale
    const callLogRes = await requestCallLogPermission(false);

    // 3. Request Notifications & Audio
    const remaining: any[] = [];
    if (Platform.Version >= 33) {
      if (PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
        remaining.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }
      if (PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO) {
        remaining.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO);
      }
    } else {
      remaining.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
    }

    if (remaining.length > 0) {
      await PermissionsAndroid.requestMultiple(remaining).catch(() => {});
    }

    const allTelephonyGranted = phoneRes.granted && callLogRes.granted;

    if (!allTelephonyGranted) {
      Alert.alert(
        'Telephony Permissions Required',
        'Lucky Companion requires both Phone State and Call Log permissions to automatically monitor SIM calls and sync recordings with Lucky CRM.\n\nPlease open Android App Settings to enable them.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openAppSettings() },
        ]
      );
    }

    return allTelephonyGranted;
  } catch (err) {
    console.warn('[ExpoCallMonitor] Failed to request permissions:', err);
    return false;
  }
}

/**
 * Attempt to open Android App Permissions settings screen directly.
 */
export function openAppPermissionsSettings(): void {
  openAppSettings();
}

/**
 * Open the system App Info settings screen so user can grant all permissions.
 */
export function openAppSettings(): void {
  if (ExpoCallMonitor?.openAppSettings) {
    try {
      ExpoCallMonitor.openAppSettings();
      return;
    } catch {}
  }
  Linking.openSettings().catch(() => {});
}

/**
 * Open All Files Access settings (for finding call recordings on Android 11+).
 */
export function openAllFilesSettings(): void {
  if (ExpoCallMonitor?.openAllFilesSettings) {
    try {
      ExpoCallMonitor.openAllFilesSettings();
      return;
    } catch {}
  }
  Linking.openSettings().catch(() => {});
}

/**
 * Open Battery Optimization settings (to prevent OEM memory cleaners from pausing sync).
 */
export function openBatterySettings(): void {
  if (ExpoCallMonitor?.openBatterySettings) {
    try {
      ExpoCallMonitor.openBatterySettings();
      return;
    } catch {}
  }
  Linking.openSettings().catch(() => {});
}

/**
 * Open Accessibility settings (for third-party or OEM call recording accessibility services).
 */
export function openAccessibilitySettings(): void {
  if (ExpoCallMonitor?.openAccessibilitySettings) {
    try {
      ExpoCallMonitor.openAccessibilitySettings();
      return;
    } catch {}
  }
  Linking.openSettings().catch(() => {});
}

/**
 * Subscribe to call events. Fires when a physical SIM call ends.
 * Returns a subscription that can be removed.
 */
export function addCallEventListener(
  listener: (event: CallEvent) => void
): EventSubscription {
  if (!ExpoCallMonitor) {
    return { remove: () => {} };
  }
  return ExpoCallMonitor.addListener('onCallEvent', listener);
}

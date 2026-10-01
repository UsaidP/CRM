import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../../lib/store';
import {
  apiClient,
  getDefaultServerUrl,
  normalizeServerUrl,
  type ConnectionDiagnostic,
} from '../../lib/api-client';
import {
  checkDetailedPermissions,
  requestRuntimePermissions,
  requestCallLogPermission,
  requestPhoneStatePermission,
  openAppSettings,
  openAllFilesSettings,
  openBatterySettings,
  openAccessibilitySettings,
  isExpoGo,
  setSimulationPermissionsGranted,
  type DetailedPermissions,
} from '../../modules/expo-call-monitor/src';

export default function SettingsScreen() {
  const userName = useAppStore((s) => s.userName);
  const brokerPhone = useAppStore((s) => s.brokerPhone);
  const serverUrl = useAppStore((s) => s.serverUrl);
  const oemRecordingPath = useAppStore((s) => s.oemRecordingPath);
  const setAuth = useAppStore((s) => s.setAuth);
  const clearAuth = useAppStore((s) => s.clearAuth);
  const setOemPath = useAppStore((s) => s.setOemPath);

  // Initialize server URL from store or apiClient or default LAN IP
  const [inputUrl, setInputUrl] = useState(() => {
    const storeVal = serverUrl && !serverUrl.includes('10.0.2.2') ? serverUrl : '';
    const clientVal = apiClient.getServerUrl();
    if (storeVal) return storeVal;
    if (clientVal && !clientVal.includes('10.0.2.2')) return clientVal;
    return getDefaultServerUrl();
  });

  const [customOemPath, setCustomOemPath] = useState(oemRecordingPath || '');
  const [testingConnection, setTestingConnection] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<ConnectionDiagnostic | null>(null);

  // Detailed permissions audit
  const [detailedPermissions, setDetailedPermissions] = useState<DetailedPermissions | null>(null);
  const [refreshingPermissions, setRefreshingPermissions] = useState(false);

  // Refresh permissions audit
  const loadPermissions = useCallback(async () => {
    try {
      setRefreshingPermissions(true);
      const perms = await checkDetailedPermissions();
      setDetailedPermissions(perms);
    } catch (err) {
      console.warn('[Settings] Failed to inspect permissions:', err);
    } finally {
      setRefreshingPermissions(false);
    }
  }, []);

  // Sync inputUrl if store serverUrl updates
  useEffect(() => {
    if (serverUrl && !serverUrl.includes('10.0.2.2')) {
      setInputUrl(serverUrl);
    }
  }, [serverUrl]);

  // Load permissions on mount and whenever user switches back from system settings
  useEffect(() => {
    loadPermissions();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadPermissions]);

  // Test Ping handler with structured diagnostics
  const handleTestConnection = async () => {
    const target = inputUrl.trim() || getDefaultServerUrl();
    setTestingConnection(true);
    setDiagnosticResult(null);

    try {
      const result = await apiClient.testConnection(target);
      setDiagnosticResult(result);

      if (result.ok) {
        Alert.alert(
          'Connection Successful',
          result.message || 'Connected and verified with Lucky CRM server.'
        );
      } else if (result.serverReachable && !result.authenticated) {
        Alert.alert(
          'Authentication Required',
          result.message,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Save Host & Sign In',
              onPress: async () => {
                await handleSaveHost();
              },
            },
          ]
        );
      } else {
        Alert.alert('Connection Failed', result.message);
      }
    } catch (err: any) {
      const fallbackResult: ConnectionDiagnostic = {
        ok: false,
        serverReachable: false,
        authenticated: false,
        message: err?.message || 'Network error reaching host. Verify Wi-Fi connection.',
        serverUrl: target,
      };
      setDiagnosticResult(fallbackResult);
      Alert.alert('Network Error', fallbackResult.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveHost = async () => {
    if (!inputUrl.trim()) {
      Alert.alert('Validation Error', 'Server URL cannot be empty.');
      return;
    }
    const cleanUrl = normalizeServerUrl(inputUrl);
    await apiClient.setCredentials(cleanUrl, apiClient.getAuthToken(), brokerPhone, userName);
    setAuth(cleanUrl, userName, brokerPhone);
    setInputUrl(cleanUrl);
    Alert.alert('Host Saved', `Active CRM server updated to:\n${cleanUrl}`);
  };

  // Dedicated Call Log Permission Request
  const handleRequestCallLog = async () => {
    try {
      const res = await requestCallLogPermission(true, {
        onSimulateCall: () => {
          Alert.alert(
            'Test Call Simulation',
            'To test CRM call sync, navigate to the Dashboard tab and tap "Simulate Call Event".'
          );
        },
        onEnableSimulation: async () => {
          setSimulationPermissionsGranted(true);
          await loadPermissions();
          Alert.alert(
            'Simulation Active',
            'Virtual Call Log permission enabled for Expo Go preview.'
          );
        },
      });
      await loadPermissions();
      if (res.granted) {
        Alert.alert('Permission Granted', 'Call Log access is now active for Lucky Companion.');
      }
    } catch (err) {
      console.warn('Call log request error:', err);
    }
  };

  // Dedicated Phone State Permission Request
  const handleRequestPhoneState = async () => {
    try {
      const res = await requestPhoneStatePermission(true);
      await loadPermissions();
      if (res.granted) {
        Alert.alert('Permission Granted', 'Phone State access is now active for Lucky Companion.');
      }
    } catch (err) {
      console.warn('Phone state request error:', err);
    }
  };

  // Request all permissions
  const handleRequestStandardPermissions = async () => {
    try {
      const granted = await requestRuntimePermissions();
      await loadPermissions();
      if (granted) {
        Alert.alert('Permissions Granted', 'Phone and Call Log permissions are fully active.');
      }
    } catch (err) {
      console.warn('Request permissions error:', err);
    }
  };

  const handleSaveOemPath = () => {
    setOemPath(customOemPath.trim() || null);
    Alert.alert('OEM Path Updated', 'Custom folder registered for call recording searches.');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out and disconnect this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await apiClient.clearCredentials();
            clearAuth();
          },
        },
      ]
    );
  };

  const isAllFilesGranted = detailedPermissions?.allFiles ?? false;
  const isBatteryUnrestricted = detailedPermissions?.batteryUnrestricted ?? false;
  const isPhoneStateGranted = detailedPermissions?.phoneState ?? false;
  const isCallLogGranted = detailedPermissions?.callLog ?? false;
  const isNotificationsGranted = detailedPermissions?.notifications ?? false;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerBadgeRow}>
          <View style={styles.headerDot} />
          <Text style={styles.headerBadgeText}>LUCKY SYSTEM TELEMETRY</Text>
        </View>
        <Text style={styles.title}>System Settings</Text>
        <Text style={styles.subtitle}>
          Manage Android permissions, call recording storage access, and CRM connectivity
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Agent Profile Card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarInitials}>
                {(userName || 'BP').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileName}>{userName || 'Broker Partner'}</Text>
              <Text style={styles.profilePhone}>{brokerPhone || '+91 7977552011'}</Text>
              <View style={styles.orgTag}>
                <Text style={styles.orgTagText}>MahaRERA Registered Agent • Lucky CRM</Text>
              </View>
            </View>
          </View>
        </View>

        {/* CRM Host Configuration */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="server-outline" size={18} color="#d4af37" />
            <Text style={styles.sectionTitle}>CRM Host & API Connectivity</Text>
          </View>

          <Text style={styles.inputLabel}>Backend Server URL</Text>
          <TextInput
            style={styles.input}
            value={inputUrl}
            onChangeText={setInputUrl}
            placeholder="http://10.189.221.87:3000"
            placeholderTextColor="#4b556b"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Quick Presets */}
          <View style={styles.presetRow}>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setInputUrl('http://10.189.221.87:3000')}
            >
              <Text style={styles.presetChipText}>Mac Wi-Fi (10.189.221.87)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setInputUrl('http://localhost:3000')}
            >
              <Text style={styles.presetChipText}>Localhost</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setInputUrl('http://10.0.2.2:3000')}
            >
              <Text style={styles.presetChipText}>Emulator</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleTestConnection}
              disabled={testingConnection}
            >
              {testingConnection ? (
                <ActivityIndicator size="small" color="#cbd5e1" />
              ) : (
                <>
                  <Ionicons name="flash-outline" size={16} color="#d4af37" />
                  <Text style={styles.secondaryButtonText}>Test Ping</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButton} onPress={handleSaveHost}>
              <Ionicons name="checkmark-outline" size={16} color="#070913" />
              <Text style={styles.primaryButtonText}>Save Host</Text>
            </TouchableOpacity>
          </View>

          {/* Diagnostic Result Banner */}
          {diagnosticResult && (
            <View
              style={[
                styles.diagnosticCard,
                diagnosticResult.ok
                  ? styles.diagnosticCardSuccess
                  : diagnosticResult.serverReachable
                  ? styles.diagnosticCardWarning
                  : styles.diagnosticCardDanger,
              ]}
            >
              <View style={styles.diagnosticHeader}>
                <Ionicons
                  name={
                    diagnosticResult.ok
                      ? 'checkmark-circle'
                      : diagnosticResult.serverReachable
                      ? 'warning'
                      : 'close-circle'
                  }
                  size={18}
                  color={
                    diagnosticResult.ok
                      ? '#34d399'
                      : diagnosticResult.serverReachable
                      ? '#fbbf24'
                      : '#f87171'
                  }
                />
                <Text
                  style={[
                    styles.diagnosticTitle,
                    {
                      color: diagnosticResult.ok
                        ? '#34d399'
                        : diagnosticResult.serverReachable
                        ? '#fbbf24'
                        : '#f87171',
                    },
                  ]}
                >
                  {diagnosticResult.ok
                    ? 'Server Online & Session Authenticated'
                    : diagnosticResult.serverReachable
                    ? 'Server Online • Auth Required'
                    : 'Server Unreachable'}
                </Text>
              </View>

              <Text style={styles.diagnosticBody}>{diagnosticResult.message}</Text>
              <Text style={styles.diagnosticHost}>Host: {diagnosticResult.serverUrl}</Text>
            </View>
          )}
        </View>

        {/* Android Permissions & Call Recording Settings */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderBetween}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#d4af37" />
              <Text style={styles.sectionTitle}>Android Call & Recording Permissions</Text>
            </View>
            <TouchableOpacity onPress={loadPermissions} disabled={refreshingPermissions}>
              <Ionicons
                name="refresh"
                size={16}
                color={refreshingPermissions ? '#64748b' : '#38bdf8'}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.permissionIntro}>
            To automatically detect incoming SIM calls and find recordings created by OEM dialers
            (Samsung, Xiaomi/MIUI, Vivo, OnePlus), grant the permissions below:
          </Text>

          {isExpoGo() && (
            <View style={styles.expoGoBannerBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="flask-outline" size={16} color="#38bdf8" />
                <Text style={styles.expoGoBannerTitle}>Expo Go Sandbox Environment</Text>
              </View>
              <Text style={styles.expoGoBannerSub}>
                Google Play prohibits Expo Go from declaring Call Log permissions. Android suppresses runtime permission popups and hides "Call logs" in Expo Go settings.
              </Text>
              <View style={styles.expoGoBannerActions}>
                <TouchableOpacity
                  style={styles.expoGoSimulateBtn}
                  onPress={async () => {
                    setSimulationPermissionsGranted(true);
                    await loadPermissions();
                    Alert.alert(
                      'Simulation Mode Active',
                      'Virtual telephony permissions enabled for Expo Go. You can now test Lucky CRM call ingestion.'
                    );
                  }}
                >
                  <Ionicons name="checkmark-done" size={12} color="#070913" />
                  <Text style={styles.expoGoSimulateBtnText}>
                    {isCallLogGranted ? 'Simulation Active' : 'Enable Dev Simulation'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.expoGoApkBtn}
                  onPress={() => {
                    Alert.alert(
                      'Standalone Android APK',
                      'To monitor real phone calls from your SIM card:\n\n1. In your terminal run:\n   bun run build:dev\n   or\n   npx eas build -p android --profile development\n\n2. Download and install the APK on your phone.\n\n3. The standalone APK has full Call Log permissions declared in its AndroidManifest.xml.'
                    );
                  }}
                >
                  <Ionicons name="phone-portrait-outline" size={12} color="#38bdf8" />
                  <Text style={styles.expoGoApkBtnText}>APK Guide</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Permission: Call Log */}
          <View style={styles.permissionRow}>
            <View style={styles.permissionIconWrap}>
              <Ionicons
                name="list-outline"
                size={18}
                color={isCallLogGranted ? '#10b981' : '#f59e0b'}
              />
            </View>
            <View style={styles.permissionTextWrap}>
              <Text style={styles.permissionName}>Read Call Log</Text>
              <Text style={styles.permissionSub}>
                {isCallLogGranted
                  ? isExpoGo()
                    ? 'Virtual simulation active: Call Log query mocked for CRM testing'
                    : 'Access active: Caller number & call duration queryable'
                  : 'Required to read client phone number, call type & duration'}
              </Text>
            </View>
            {isCallLogGranted ? (
              <View style={[styles.statusBadge, styles.statusBadgeGranted]}>
                <Ionicons name="checkmark-circle" size={12} color="#10b981" style={{ marginRight: 4 }} />
                <Text style={[styles.statusBadgeText, { color: '#10b981' }]}>
                  {isExpoGo() ? 'Simulated' : 'Granted'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.grantBadgeButton}
                onPress={handleRequestCallLog}
                activeOpacity={0.7}
              >
                <Ionicons name="shield" size={12} color="#070913" />
                <Text style={styles.grantBadgeButtonText}>Grant</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Permission: Phone State */}
          <View style={styles.permissionRow}>
            <View style={styles.permissionIconWrap}>
              <Ionicons
                name="call-outline"
                size={18}
                color={isPhoneStateGranted ? '#10b981' : '#f59e0b'}
              />
            </View>
            <View style={styles.permissionTextWrap}>
              <Text style={styles.permissionName}>Read Phone State</Text>
              <Text style={styles.permissionSub}>
                {isPhoneStateGranted
                  ? 'Access active: Detects incoming & outgoing call triggers'
                  : 'Detects incoming, outgoing, and missed call states'}
              </Text>
            </View>
            {isPhoneStateGranted ? (
              <View style={[styles.statusBadge, styles.statusBadgeGranted]}>
                <Ionicons name="checkmark-circle" size={12} color="#10b981" style={{ marginRight: 4 }} />
                <Text style={[styles.statusBadgeText, { color: '#10b981' }]}>
                  {isExpoGo() ? 'Simulated' : 'Granted'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.grantBadgeButton}
                onPress={handleRequestPhoneState}
                activeOpacity={0.7}
              >
                <Ionicons name="shield" size={12} color="#070913" />
                <Text style={styles.grantBadgeButtonText}>Grant</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Permission: Call Recordings (All Files Access) */}
          <View style={styles.permissionRow}>
            <View style={styles.permissionIconWrap}>
              <MaterialCommunityIcons
                name="folder-music-outline"
                size={18}
                color={isAllFilesGranted ? '#10b981' : '#f59e0b'}
              />
            </View>
            <View style={styles.permissionTextWrap}>
              <Text style={styles.permissionName}>Call Recording Storage Access</Text>
              <Text style={styles.permissionSub}>
                {isAllFilesGranted
                  ? 'All Files Access active: Can scan OEM recording folders'
                  : 'Required on Android 11+ to discover OEM dialer audio files'}
              </Text>
            </View>
            {isAllFilesGranted ? (
              <View style={[styles.statusBadge, styles.statusBadgeGranted]}>
                <Ionicons name="checkmark-circle" size={12} color="#10b981" style={{ marginRight: 4 }} />
                <Text style={[styles.statusBadgeText, { color: '#10b981' }]}>Granted</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.grantBadgeButton}
                onPress={() => openAllFilesSettings()}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="folder-cog" size={12} color="#070913" />
                <Text style={styles.grantBadgeButtonText}>Enable</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Permission: Notifications */}
          <View style={styles.permissionRow}>
            <View style={styles.permissionIconWrap}>
              <Ionicons
                name="notifications-outline"
                size={18}
                color={isNotificationsGranted ? '#10b981' : '#f59e0b'}
              />
            </View>
            <View style={styles.permissionTextWrap}>
              <Text style={styles.permissionName}>Notifications</Text>
              <Text style={styles.permissionSub}>
                Keeps persistent foreground service active on Android 13+
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                isNotificationsGranted ? styles.statusBadgeGranted : styles.statusBadgeMissing,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isNotificationsGranted ? { color: '#10b981' } : { color: '#f59e0b' },
                ]}
              >
                {isNotificationsGranted ? 'Granted' : 'Missing'}
              </Text>
            </View>
          </View>

          {/* Permission: Battery Optimization */}
          <View style={[styles.permissionRow, { borderBottomWidth: 0 }]}>
            <View style={styles.permissionIconWrap}>
              <Ionicons
                name="battery-charging-outline"
                size={18}
                color={isBatteryUnrestricted ? '#10b981' : '#f59e0b'}
              />
            </View>
            <View style={styles.permissionTextWrap}>
              <Text style={styles.permissionName}>Battery Optimization</Text>
              <Text style={styles.permissionSub}>
                Exemption stops Samsung/MIUI task killers from closing background sync
              </Text>
            </View>
            {isBatteryUnrestricted ? (
              <View style={[styles.statusBadge, styles.statusBadgeGranted]}>
                <Ionicons name="checkmark-circle" size={12} color="#10b981" style={{ marginRight: 4 }} />
                <Text style={[styles.statusBadgeText, { color: '#10b981' }]}>Unrestricted</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.grantBadgeButton}
                onPress={() => openBatterySettings()}
                activeOpacity={0.7}
              >
                <Ionicons name="battery-dead" size={12} color="#070913" />
                <Text style={styles.grantBadgeButtonText}>Exempt</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Master Action Buttons */}
          <View style={styles.settingsActionList}>
            <TouchableOpacity
              style={styles.actionButtonGold}
              onPress={handleRequestStandardPermissions}
            >
              <Ionicons name="shield-checkmark" size={18} color="#070913" />
              <Text style={styles.actionButtonGoldText}>Grant Call Log & Phone Permissions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButtonDark}
              onPress={() => openAllFilesSettings()}
            >
              <MaterialCommunityIcons name="folder-cog-outline" size={18} color="#d4af37" />
              <View style={styles.actionButtonContent}>
                <Text style={styles.actionButtonDarkTitle}>
                  Open Call Recording (All Files) Settings
                </Text>
                <Text style={styles.actionButtonDarkSubtitle}>
                  Enable "Allow access to manage all files" for Lucky Companion
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#8e9bb0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButtonDark} onPress={() => openAppSettings()}>
              <Ionicons name="settings-outline" size={18} color="#38bdf8" />
              <View style={styles.actionButtonContent}>
                <Text style={styles.actionButtonDarkTitle}>Open Android App Info Settings</Text>
                <Text style={styles.actionButtonDarkSubtitle}>
                  Manage Microphone, Phone, Call Logs & Notification permissions
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#8e9bb0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButtonDark}
              onPress={() => openBatterySettings()}
            >
              <Ionicons name="battery-dead-outline" size={18} color="#a78bfa" />
              <View style={styles.actionButtonContent}>
                <Text style={styles.actionButtonDarkTitle}>
                  Disable Battery Optimization Settings
                </Text>
                <Text style={styles.actionButtonDarkSubtitle}>
                  Select "Don't optimize" or "Unrestricted" for 24/7 call sync
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#8e9bb0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButtonDark}
              onPress={() => openAccessibilitySettings()}
            >
              <Ionicons name="accessibility-outline" size={18} color="#34d399" />
              <View style={styles.actionButtonContent}>
                <Text style={styles.actionButtonDarkTitle}>Open Accessibility Settings</Text>
                <Text style={styles.actionButtonDarkSubtitle}>
                  Configure third-party or OEM call recorder accessibility service
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#8e9bb0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* OEM Folder Override */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="folder-music-outline" size={18} color="#d4af37" />
            <Text style={styles.sectionTitle}>OEM Audio Discovery Folder</Text>
          </View>

          <Text style={styles.inputLabel}>Storage Path</Text>
          <TextInput
            style={styles.input}
            value={customOemPath}
            onChangeText={setCustomOemPath}
            placeholder="/storage/emulated/0/Recordings/Call"
            placeholderTextColor="#4b556b"
            autoCapitalize="none"
          />
          <Text style={styles.helperText}>
            Leave blank to use automatic multi-OEM fallback detection (Samsung, MIUI, Vivo, OnePlus).
          </Text>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleSaveOemPath}>
            <Text style={styles.secondaryButtonText}>Update OEM Path</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#f87171" />
          <Text style={styles.logoutButtonText}>Disconnect & Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070913',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#161d33',
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d4af37',
  },
  headerBadgeText: {
    color: '#d4af37',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#8e9bb0',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  scrollBody: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#0f1322',
    borderWidth: 1,
    borderColor: '#1e2640',
    borderRadius: 16,
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: '#d4af37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#d4af37',
    fontSize: 18,
    fontWeight: '700',
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  profilePhone: {
    color: '#8e9bb0',
    fontSize: 13,
    marginTop: 2,
  },
  orgTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  orgTagText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  permissionIntro: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#161c33',
    borderWidth: 1,
    borderColor: '#273356',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  presetChip: {
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  presetChipText: {
    color: '#d4af37',
    fontSize: 11,
    fontWeight: '600',
  },
  helperText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 6,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#161c33',
    borderWidth: 1,
    borderColor: '#273356',
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButtonText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#d4af37',
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButtonText: {
    color: '#070913',
    fontSize: 13,
    fontWeight: '700',
  },
  diagnosticCard: {
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
  },
  diagnosticCardSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  diagnosticCardWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  diagnosticCardDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  diagnosticHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  diagnosticTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  diagnosticBody: {
    color: '#e2e8f0',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  diagnosticHost: {
    color: '#94a3b8',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#161d33',
    gap: 12,
  },
  permissionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#161c33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionTextWrap: {
    flex: 1,
  },
  permissionName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  permissionSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeGranted: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusBadgeMissing: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  grantBadgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d4af37',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  grantBadgeButtonText: {
    color: '#070913',
    fontSize: 11,
    fontWeight: '700',
  },
  settingsActionList: {
    marginTop: 16,
    gap: 10,
  },
  actionButtonGold: {
    backgroundColor: '#d4af37',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonGoldText: {
    color: '#070913',
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonDark: {
    backgroundColor: '#161c33',
    borderWidth: 1,
    borderColor: '#273356',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonDarkTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonDarkSubtitle: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '700',
  },
  expoGoBannerBox: {
    backgroundColor: '#071d2e',
    borderWidth: 1,
    borderColor: '#0284c7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  expoGoBannerTitle: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  expoGoBannerSub: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  expoGoBannerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  expoGoSimulateBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expoGoSimulateBtnText: {
    color: '#070913',
    fontSize: 11,
    fontWeight: '700',
  },
  expoGoApkBtn: {
    backgroundColor: '#161c33',
    borderWidth: 1,
    borderColor: '#273356',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expoGoApkBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
});

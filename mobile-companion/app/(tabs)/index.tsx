import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  AppState,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAppStore } from '../../lib/store';
import {
  startMonitoring,
  stopMonitoring,
  hasPermissions,
  requestRuntimePermissions,
  requestCallLogPermission,
  requestPhoneStatePermission,
  openAppSettings,
  isExpoGo,
  setSimulationPermissionsGranted,
} from '../../modules/expo-call-monitor/src';
import { processCallEvent } from '../../lib/sync-service';

export default function DashboardScreen() {
  const userName = useAppStore((s) => s.userName);
  const brokerPhone = useAppStore((s) => s.brokerPhone);
  const isMonitoring = useAppStore((s) => s.isMonitoring);
  const setMonitoring = useAppStore((s) => s.setMonitoring);
  const deviceInfo = useAppStore((s) => s.deviceInfo);
  const oemRecordingPath = useAppStore((s) => s.oemRecordingPath);
  const recentCalls = useAppStore((s) => s.recentCalls);

  const [isSimulating, setIsSimulating] = useState(false);
  const [hasPerms, setHasPerms] = useState(true);

  // Monitor telephony permissions dynamically
  useEffect(() => {
    const check = () => {
      try {
        setHasPerms(hasPermissions());
      } catch {
        setHasPerms(false);
      }
    };
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, []);

  // Toggle foreground call monitoring
  const handleToggleMonitoring = async (value: boolean) => {
    try {
      if (value) {
        let permitted = false;
        try {
          permitted = hasPermissions();
        } catch {
          permitted = false;
        }

        if (!permitted) {
          Alert.alert(
            'Permissions Required',
            'Lucky Companion needs Phone State and Call Log permissions to automatically monitor calls and sync recordings with Lucky CRM.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Request Permissions',
                onPress: async () => {
                  const granted = await requestRuntimePermissions();
                  if (granted) {
                    const started = startMonitoring();
                    setMonitoring(started);
                  } else {
                    Alert.alert(
                      'Settings Required',
                      'Permissions were not granted. Please open Android Settings to enable Phone, Call Log, and Storage permissions.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => openAppSettings() },
                      ]
                    );
                  }
                },
              },
              {
                text: 'Open Settings',
                onPress: () => openAppSettings(),
              },
            ]
          );
          return;
        }
        const started = startMonitoring();
        setMonitoring(started);
      } else {
        stopMonitoring();
        setMonitoring(false);
      }
    } catch (err: any) {
      console.warn('Monitoring toggle in dev client:', err);
      // Fallback state update for simulator testing
      setMonitoring(value);
    }
  };

  // Test simulation: create a sample call event to verify pipeline
  const handleSimulateCall = async () => {
    if (!__DEV__ && !isExpoGo()) {
      Alert.alert('Simulation Restricted', 'Call simulation is only allowed in development or Expo Go.');
      return;
    }
    setIsSimulating(true);
    const mockCall = {
      clientCallId: `sim_${Date.now()}`,
      phoneNumber: '+919820098200',
      direction: 'OUTGOING' as const,
      durationSeconds: 42,
      callEndTimeMs: Date.now(),
    };

    try {
      await processCallEvent(mockCall);
      Alert.alert(
        'Call Event Simulated',
        `Dispatched call to +919820098200 (42s). Check Call History for sync status.`
      );
    } catch (err: any) {
      Alert.alert('Simulation Error', err?.message || 'Failed to process event');
    } finally {
      setIsSimulating(false);
    }
  };

  // Stats calculation
  const totalCalls = recentCalls.length;
  const syncedCalls = recentCalls.filter((c) => c.syncStatus === 'synced').length;
  const pendingCalls = recentCalls.filter((c) => c.syncStatus === 'pending' || c.syncStatus === 'syncing').length;
  const withRecordings = recentCalls.filter((c) => !!c.recordingUrl).length;

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View>
          <View style={styles.roleBadgeRow}>
            <View style={styles.badgeIndicator} />
            <Text style={styles.badgeLabel}>TELEMETRY ACTIVE</Text>
          </View>
          <Text style={styles.userNameText}>{userName || 'Broker Partner'}</Text>
          <Text style={styles.userPhoneText}>{brokerPhone || '+91 7977552011'}</Text>
        </View>

        <View style={styles.statusPill}>
          <Ionicons
            name={isMonitoring ? 'shield-checkmark' : 'shield-outline'}
            size={18}
            color={isMonitoring ? '#10b981' : '#64748b'}
          />
          <Text
            style={[
              styles.statusPillText,
              { color: isMonitoring ? '#10b981' : '#64748b' },
            ]}
          >
            {isMonitoring ? 'ONLINE' : 'IDLE'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        {/* Missing Telephony Permissions or Expo Go Warning Banner */}
        {!hasPerms && (
          <View style={[styles.permissionAlertBanner, isExpoGo() && styles.expoGoAlertBanner]}>
            <View style={styles.permissionAlertTopRow}>
              <Ionicons
                name={isExpoGo() ? 'flask' : 'call'}
                size={20}
                color={isExpoGo() ? '#38bdf8' : '#fbbf24'}
              />
              <View style={styles.permissionAlertTextWrap}>
                <Text
                  style={[
                    styles.permissionAlertTitle,
                    isExpoGo() && { color: '#38bdf8' },
                  ]}
                >
                  {isExpoGo()
                    ? 'Expo Go Mode • Telephony Simulation Available'
                    : 'Call Log & Phone Permissions Needed'}
                </Text>
                <Text style={styles.permissionAlertSub}>
                  {isExpoGo()
                    ? 'Google Play removes Call Log permissions from Expo Go. Use the built-in simulator to test Lucky CRM sync, or install a standalone APK for physical SIM calls.'
                    : 'Lucky Companion requires Call Log permission to record client numbers & duration for CRM sync.'}
                </Text>
              </View>
            </View>

            <View style={styles.permissionAlertActionRow}>
              {isExpoGo() ? (
                <>
                  <TouchableOpacity
                    style={styles.permissionAlertGrantBtn}
                    onPress={handleSimulateCall}
                    disabled={isSimulating}
                  >
                    <Ionicons name="play" size={14} color="#070913" />
                    <Text style={styles.permissionAlertGrantBtnText}>
                      {isSimulating ? 'Simulating...' : 'Simulate Call'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.permissionAlertSettingsBtn, { borderColor: '#0284c7' }]}
                    onPress={() => {
                      setSimulationPermissionsGranted(true);
                      setHasPerms(true);
                      Alert.alert(
                        'Simulation Mode Active',
                        'Call permissions have been virtually enabled for Expo Go. You can now toggle monitoring and test CRM synchronization.'
                      );
                    }}
                  >
                    <Ionicons name="checkmark-done-outline" size={14} color="#38bdf8" />
                    <Text style={[styles.permissionAlertSettingsBtnText, { color: '#38bdf8' }]}>
                      Enable Dev Mode
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.permissionAlertSettingsBtn}
                    onPress={() => {
                      Alert.alert(
                        'Standalone Android APK',
                        'To test automatic SIM call logging on your physical Android phone:\n\n1. In your project terminal, run:\n   bun run build:dev\n   or\n   npx eas build -p android --profile development\n\n2. Download and install the generated APK on your phone.\n\n3. The standalone APK has READ_CALL_LOG & READ_PHONE_STATE declared in its AndroidManifest.xml and can monitor real phone calls automatically.',
                        [{ text: 'Understood' }]
                      );
                    }}
                  >
                    <Ionicons name="information-circle-outline" size={14} color="#cbd5e1" />
                    <Text style={styles.permissionAlertSettingsBtnText}>Dev APK</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.permissionAlertGrantBtn}
                    onPress={async () => {
                      const res = await requestCallLogPermission(true, {
                        onSimulateCall: handleSimulateCall,
                        onEnableSimulation: () => setHasPerms(true),
                      });
                      if (res.granted) {
                        await requestPhoneStatePermission(false);
                      }
                      try {
                        setHasPerms(hasPermissions());
                      } catch { }
                    }}
                  >
                    <Ionicons name="shield-checkmark" size={14} color="#070913" />
                    <Text style={styles.permissionAlertGrantBtnText}>Grant Call Log Permission</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.permissionAlertSettingsBtn}
                    onPress={() => openAppSettings()}
                  >
                    <Ionicons name="settings-outline" size={14} color="#cbd5e1" />
                    <Text style={styles.permissionAlertSettingsBtnText}>App Settings</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* Main Service Toggle Card */}
        <View style={[styles.card, isMonitoring && styles.cardActiveGlow]}>
          <View style={styles.serviceRow}>
            <View style={styles.serviceIconWrap}>
              <Ionicons
                name="radio"
                size={24}
                color={isMonitoring ? '#d4af37' : '#64748b'}
              />
            </View>
            <View style={styles.serviceTextWrap}>
              <Text style={styles.cardHeading}>Foreground Call Monitor</Text>
              <Text style={styles.cardSubheading}>
                {isMonitoring
                  ? 'Listening for SIM calls & auto-syncing audio'
                  : 'Monitoring paused • Tap switch to activate'}
              </Text>
            </View>
            <Switch
              value={isMonitoring}
              onValueChange={handleToggleMonitoring}
              trackColor={{ false: '#1e2640', true: '#d4af37' }}
              thumbColor={isMonitoring ? '#ffffff' : '#94a3b8'}
            />
          </View>

          {isMonitoring && (
            <View style={styles.activeServiceBanner}>
              <View style={styles.pulsingGreen} />
              <Text style={styles.activeBannerText}>
                Android Service active with phoneCall type foreground notification
              </Text>
            </View>
          )}
        </View>

        {/* Quick Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{totalCalls}</Text>
            <Text style={styles.metricLabel}>Total Calls</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#10b981' }]}>{syncedCalls}</Text>
            <Text style={styles.metricLabel}>CRM Synced</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#f59e0b' }]}>{pendingCalls}</Text>
            <Text style={styles.metricLabel}>Pending</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#38bdf8' }]}>{withRecordings}</Text>
            <Text style={styles.metricLabel}>Recordings</Text>
          </View>
        </View>

        {/* Device & OEM Telemetry */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="cellphone-sound" size={20} color="#d4af37" />
            <Text style={styles.sectionTitle}>OEM Recording Engine</Text>
          </View>

          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryKey}>Device Model</Text>
            <Text style={styles.telemetryValue}>
              {deviceInfo ? `${deviceInfo.manufacturer} ${deviceInfo.model}` : 'Generic Android Device'}
            </Text>
          </View>

          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryKey}>OS Build</Text>
            <Text style={styles.telemetryValue}>
              {deviceInfo ? deviceInfo.androidVersion : 'Android 14+ (API 34)'}
            </Text>
          </View>

          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryKey}>OEM Recording Path</Text>
            <Text style={[styles.telemetryValue, styles.pathText]} numberOfLines={1}>
              {oemRecordingPath || '/storage/emulated/0/Recordings/Call'}
            </Text>
          </View>

          <View style={styles.detectionNotice}>
            <Ionicons name="information-circle-outline" size={16} color="#38bdf8" />
            <Text style={styles.detectionNoticeText}>
              Automatic 2.5s post-call delay configured to allow OEM hardware audio encoders to finalize files.
            </Text>
          </View>
        </View>

        {/* Developer / Simulation Action */}
        {(__DEV__ || isExpoGo()) && (
          <TouchableOpacity
            style={styles.simulateButton}
            onPress={handleSimulateCall}
            disabled={isSimulating}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="test-tube" size={18} color="#d4af37" />
            <Text style={styles.simulateButtonText}>
              {isSimulating ? 'Processing Simulated Call...' : 'Test Simulation Call (+919820098200)'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Recent Calls Feed */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="time-outline" size={20} color="#d4af37" />
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>

          {recentCalls.length === 0 ? (
            <View style={styles.emptyFeed}>
              <Ionicons name="call-outline" size={32} color="#334155" />
              <Text style={styles.emptyFeedText}>No calls tracked yet in this session</Text>
              <Text style={styles.emptyFeedSubtext}>
                Incoming and outgoing phone calls will appear here automatically.
              </Text>
            </View>
          ) : (
            recentCalls.slice(0, 4).map((call) => (
              <View key={call.clientCallId} style={styles.callRow}>
                <View style={styles.callDirectionIcon}>
                  <Ionicons
                    name={
                      call.direction === 'INCOMING'
                        ? 'arrow-down'
                        : call.direction === 'OUTGOING'
                          ? 'arrow-up'
                          : 'close'
                    }
                    size={16}
                    color={
                      call.direction === 'MISSED'
                        ? '#ef4444'
                        : call.direction === 'INCOMING'
                          ? '#10b981'
                          : '#38bdf8'
                    }
                  />
                </View>

                <View style={styles.callInfo}>
                  <Text style={styles.callNumber}>{call.phoneNumber}</Text>
                  <Text style={styles.callSubinfo}>
                    {call.direction} • {call.durationSeconds}s
                  </Text>
                </View>

                <View
                  style={[
                    styles.syncBadge,
                    call.syncStatus === 'synced' && styles.syncBadgeSuccess,
                    call.syncStatus === 'syncing' && styles.syncBadgePending,
                    call.syncStatus === 'failed' && styles.syncBadgeFailed,
                  ]}
                >
                  <Text
                    style={[
                      styles.syncBadgeText,
                      call.syncStatus === 'synced' && { color: '#34d399' },
                      call.syncStatus === 'syncing' && { color: '#f59e0b' },
                      call.syncStatus === 'failed' && { color: '#f87171' },
                    ]}
                  >
                    {call.syncStatus.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#161d33',
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  badgeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  badgeLabel: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  userNameText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  userPhoneText: {
    color: '#8e9bb0',
    fontSize: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12172a',
    borderWidth: 1,
    borderColor: '#242f52',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollBody: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  card: {
    backgroundColor: '#0f1322',
    borderWidth: 1,
    borderColor: '#1e2640',
    borderRadius: 16,
    padding: 16,
  },
  cardActiveGlow: {
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#161c33',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceTextWrap: {
    flex: 1,
  },
  cardHeading: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubheading: {
    color: '#8e9bb0',
    fontSize: 12,
    marginTop: 2,
  },
  activeServiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 14,
    gap: 8,
  },
  pulsingGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  activeBannerText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#0f1322',
    borderWidth: 1,
    borderColor: '#1e2640',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  metricVal: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#161c33',
  },
  telemetryKey: {
    color: '#8e9bb0',
    fontSize: 12,
  },
  telemetryValue: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  pathText: {
    maxWidth: '55%',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#d4af37',
  },
  detectionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12172a',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  detectionNoticeText: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  simulateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151b30',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  simulateButtonText: {
    color: '#d4af37',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyFeedText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  emptyFeedSubtext: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: '80%',
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#161c33',
  },
  callDirectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#161c33',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  callInfo: {
    flex: 1,
  },
  callNumber: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  callSubinfo: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  syncBadge: {
    backgroundColor: '#1e293b',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  syncBadgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  syncBadgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  syncBadgeFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  syncBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  permissionAlertBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  expoGoAlertBanner: {
    backgroundColor: '#071d2e',
    borderColor: '#0284c7',
  },
  permissionAlertTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permissionAlertTextWrap: {
    flex: 1,
  },
  permissionAlertTitle: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '700',
  },
  permissionAlertSub: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  permissionAlertActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  permissionAlertGrantBtn: {
    flex: 1,
    backgroundColor: '#d4af37',
    borderRadius: 8,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  permissionAlertGrantBtnText: {
    color: '#070913',
    fontSize: 12,
    fontWeight: '700',
  },
  permissionAlertSettingsBtn: {
    backgroundColor: '#161c33',
    borderWidth: 1,
    borderColor: '#273356',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  permissionAlertSettingsBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore, type CallLogEntry } from '../../lib/store';
import { processCallEvent } from '../../lib/sync-service';

export default function CallsScreen() {
  const recentCalls = useAppStore((s) => s.recentCalls);
  const [filter, setFilter] = useState<'ALL' | 'INCOMING' | 'OUTGOING' | 'MISSED'>('ALL');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const filteredCalls = recentCalls.filter((c) => {
    if (filter === 'ALL') return true;
    return c.direction === filter;
  });

  const handleRetry = async (call: CallLogEntry) => {
    setRetryingId(call.clientCallId);
    try {
      await processCallEvent({
        clientCallId: call.clientCallId,
        phoneNumber: call.phoneNumber,
        direction: call.direction,
        durationSeconds: call.durationSeconds,
        callEndTimeMs: call.callEndTimeMs,
      });
    } catch (err: any) {
      Alert.alert('Sync Retry Error', err?.message || 'Failed to retry sync');
    } finally {
      setRetryingId(null);
    }
  };

  const handleOpenRecording = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert('Playback Error', 'Cannot open recording URL: ' + url);
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Call Sync History</Text>
        <Text style={styles.subtitle}>
          Real-time SIM call recordings synced with MahaRERA deal pipeline
        </Text>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['ALL', 'INCOMING', 'OUTGOING', 'MISSED'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterPill, filter === type && styles.filterPillActive]}
              onPress={() => setFilter(type)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filter === type && styles.filterPillTextActive,
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Calls List */}
      <FlatList
        data={filteredCalls}
        keyExtractor={(item) => item.clientCallId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="phone-remove" size={48} color="#334155" />
            <Text style={styles.emptyTitle}>No Calls Recorded</Text>
            <Text style={styles.emptyDesc}>
              Make or receive phone calls using your Android SIM to see them automatically
              captured here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.callCard}>
            <View style={styles.cardTopRow}>
              {/* Direction Icon */}
              <View
                style={[
                  styles.directionIconBox,
                  item.direction === 'MISSED' && styles.directionMissed,
                  item.direction === 'INCOMING' && styles.directionIncoming,
                  item.direction === 'OUTGOING' && styles.directionOutgoing,
                ]}
              >
                <Ionicons
                  name={
                    item.direction === 'INCOMING'
                      ? 'arrow-down'
                      : item.direction === 'OUTGOING'
                      ? 'arrow-up'
                      : 'close'
                  }
                  size={16}
                  color={
                    item.direction === 'MISSED'
                      ? '#ef4444'
                      : item.direction === 'INCOMING'
                      ? '#10b981'
                      : '#38bdf8'
                  }
                />
              </View>

              {/* Call Details */}
              <View style={styles.cardDetails}>
                <Text style={styles.phoneNumberText}>{item.phoneNumber}</Text>
                <Text style={styles.callMetaText}>
                  {item.direction} • {formatDuration(item.durationSeconds)} • {formatTime(item.timestamp)}
                </Text>
              </View>

              {/* Status Badge */}
              <View
                style={[
                  styles.syncBadge,
                  item.syncStatus === 'synced' && styles.syncBadgeSynced,
                  item.syncStatus === 'syncing' && styles.syncBadgeSyncing,
                  item.syncStatus === 'failed' && styles.syncBadgeFailed,
                ]}
              >
                <Text
                  style={[
                    styles.syncBadgeText,
                    item.syncStatus === 'synced' && { color: '#34d399' },
                    item.syncStatus === 'syncing' && { color: '#f59e0b' },
                    item.syncStatus === 'failed' && { color: '#f87171' },
                  ]}
                >
                  {item.syncStatus.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Bottom Row: Recording & Retry */}
            <View style={styles.cardBottomRow}>
              {item.recordingUrl ? (
                <TouchableOpacity
                  style={styles.recordingPill}
                  onPress={() => handleOpenRecording(item.recordingUrl)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="play" size={14} color="#d4af37" />
                  <Text style={styles.recordingPillText}>Play Recording</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.noRecordingBox}>
                  <Ionicons name="mic-off-outline" size={13} color="#64748b" />
                  <Text style={styles.noRecordingText}>No audio file detected</Text>
                </View>
              )}

              {item.syncStatus === 'failed' && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => handleRetry(item)}
                  disabled={retryingId === item.clientCallId}
                >
                  <Ionicons name="refresh" size={13} color="#f87171" />
                  <Text style={styles.retryButtonText}>
                    {retryingId === item.clientCallId ? 'Retrying...' : 'Retry Sync'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
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
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#8e9bb0',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#12172a',
    borderWidth: 1,
    borderColor: '#1e2640',
  },
  filterPillActive: {
    backgroundColor: '#d4af37',
    borderColor: '#d4af37',
  },
  filterPillText: {
    color: '#8e9bb0',
    fontSize: 11,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#070913',
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyDesc: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: '80%',
    lineHeight: 18,
  },
  callCard: {
    backgroundColor: '#0f1322',
    borderWidth: 1,
    borderColor: '#1e2640',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  directionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#161c33',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  directionIncoming: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  directionOutgoing: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  directionMissed: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  cardDetails: {
    flex: 1,
  },
  phoneNumberText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  callMetaText: {
    color: '#8e9bb0',
    fontSize: 11,
    marginTop: 2,
  },
  syncBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#1a2238',
  },
  syncBadgeSynced: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  syncBadgeSyncing: {
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
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#161c33',
  },
  recordingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  recordingPillText: {
    color: '#d4af37',
    fontSize: 11,
    fontWeight: '600',
  },
  noRecordingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noRecordingText: {
    color: '#64748b',
    fontSize: 11,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  retryButtonText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600',
  },
});

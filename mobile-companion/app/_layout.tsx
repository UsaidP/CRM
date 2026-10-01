import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { apiClient } from '../lib/api-client';
import { useAppStore } from '../lib/store';
import { processCallEvent } from '../lib/sync-service';
import {
  addCallEventListener,
  hasPermissions,
  getDeviceInfo,
} from '../modules/expo-call-monitor/src';
import { getDetectedOemPath } from '../modules/expo-recording-finder/src';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setAuth = useAppStore((s) => s.setAuth);
  const setDeviceInfo = useAppStore((s) => s.setDeviceInfo);
  const setOemPath = useAppStore((s) => s.setOemPath);

  // 1. Initialize API Client & restore credentials from SecureStore
  useEffect(() => {
    async function setupApp() {
      try {
        const creds = await apiClient.init();
        if (creds.serverUrl && creds.authToken) {
          setAuth(creds.serverUrl, creds.userName || 'Broker', creds.brokerPhone);
        }

        // Query device telemetry & OEM path
        try {
          const info = getDeviceInfo();
          if (info) {
            setDeviceInfo({
              manufacturer: info.manufacturer,
              model: info.model,
              androidVersion: `Android ${info.androidVersion} (API ${info.sdkVersion})`,
            });
          }
        } catch (e) {
          console.warn('[Layout] Device info detection fallback:', e);
        }

        try {
          const oem = getDetectedOemPath();
          if (oem) {
            setOemPath(oem);
          }
        } catch (e) {
          console.warn('[Layout] OEM path detection fallback:', e);
        }
      } catch (err) {
        console.error('[Layout] Init error:', err);
      } finally {
        setIsReady(true);
      }
    }

    setupApp();
  }, [setAuth, setDeviceInfo, setOemPath]);

  // 2. Wire native SIM Call Event Listener -> sync-service
  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    try {
      subscription = addCallEventListener((event) => {
        console.log('[Layout] Native Call Event Received:', event);
        processCallEvent(event).catch((err) => {
          console.error('[Layout] Error processing call event:', err);
        });
      });
    } catch (e) {
      console.warn('[Layout] Call monitor module listener note (development mode):', e);
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // 3. Auth navigation guard
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isReady, segments, router]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#070913' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070913',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#070913',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

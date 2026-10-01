import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiClient, getDefaultServerUrl } from '../../lib/api-client';
import { useAppStore } from '../../lib/store';

export default function LoginScreen() {
  const [serverUrl, setServerUrl] = useState(getDefaultServerUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);

  useEffect(() => {
    // Sync with apiClient's detected or stored URL
    const current = apiClient.getServerUrl();
    if (current && !current.includes('10.0.2.2')) {
      setServerUrl(current);
    } else {
      setServerUrl(getDefaultServerUrl());
    }
  }, []);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const setAuth = useAppStore((s) => s.setAuth);

  const fullPhone = `${countryCode}${phoneNumber.trim().replace(/^0+/, '')}`;

  const handleSendOtp = async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    const cleanPhone = phoneNumber.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!serverUrl.trim()) {
      setErrorMessage('Please enter the CRM Server URL.');
      setShowServerConfig(true);
      return;
    }

    setIsLoading(true);
    // Temporary set server URL for this request
    apiClient.setCredentials(serverUrl.trim(), '');

    try {
      const result = await apiClient.sendOtp(fullPhone);

      if (result.success) {
        setStep('OTP');
        setStatusMessage(result.message || `OTP dispatched to ${fullPhone}`);
      } else {
        setErrorMessage(result.error || 'Failed to send OTP. Please verify phone number.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error connecting to CRM server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage(null);

    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setErrorMessage('Please enter the full 6-digit OTP code.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await apiClient.verifyOtp(fullPhone, cleanOtp);

      if (result.success && result.token) {
        const userName = result.user?.fullName || 'Broker';
        await apiClient.setCredentials(serverUrl.trim(), result.token, fullPhone, userName);
        setAuth(serverUrl.trim(), userName, fullPhone);
      } else {
        setErrorMessage(result.error || 'Invalid or expired OTP. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification error. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={styles.liveIndicator}>
              <View style={styles.pulseDot} />
              <Text style={styles.badgeText}>LUCKY GATEWAY v2.0</Text>
            </View>
            <View style={styles.reraBadge}>
              <Text style={styles.reraText}>MahaRERA COMPLIANT</Text>
            </View>
          </View>

          <Text style={styles.title}>Lucky Companion</Text>
          <Text style={styles.subtitle}>
            Secure hardware telemetry & background SIM call audio sync for Lucky CRM
          </Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          {/* Server Config Toggle */}
          <TouchableOpacity
            style={styles.serverToggle}
            onPress={() => setShowServerConfig(!showServerConfig)}
            activeOpacity={0.7}
          >
            <Ionicons name="server-outline" size={16} color="#8e9bb0" />
            <Text style={styles.serverToggleText}>
              Host: {serverUrl.replace(/https?:\/\//, '')}
            </Text>
            <Ionicons
              name={showServerConfig ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#8e9bb0"
            />
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.serverInputGroup}>
              <Text style={styles.inputLabel}>CRM API Server URL</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://10.189.221.87:3000 or http://localhost:3000"
                placeholderTextColor="#4b556b"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.presetRow}>
                <TouchableOpacity
                  style={[
                    styles.presetButton,
                    serverUrl.includes('10.189.221.87') && styles.presetButtonActive,
                  ]}
                  onPress={() => setServerUrl('http://10.189.221.87:3000')}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      serverUrl.includes('10.189.221.87') && styles.presetButtonTextActive,
                    ]}
                  >
                    Mac Wi-Fi (10.189.221.87)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.presetButton,
                    serverUrl.includes('localhost') && styles.presetButtonActive,
                  ]}
                  onPress={() => setServerUrl('http://localhost:3000')}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      serverUrl.includes('localhost') && styles.presetButtonTextActive,
                    ]}
                  >
                    Localhost:3000
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                Physical phones must use your Mac's Wi-Fi IP (10.189.221.87:3000) so they can reach the CRM server.
              </Text>
            </View>
          )}

          {/* Feedback Messages */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#f87171" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {statusMessage && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#34d399" />
              <Text style={styles.successText}>{statusMessage}</Text>
            </View>
          )}

          {step === 'PHONE' ? (
            /* Step 1: Phone Entry */
            <View style={styles.stepContainer}>
              <Text style={styles.inputLabel}>Registered Broker Mobile</Text>
              <View style={styles.phoneInputRow}>
                <View style={styles.countryCodeBox}>
                  <Text style={styles.countryCodeText}>{countryCode}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="7977552011"
                  placeholderTextColor="#4b556b"
                  keyboardType="phone-pad"
                  maxLength={12}
                />
              </View>
              <Text style={styles.helperText}>
                Enter the mobile number linked to your Broker / Agent seat
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#070913" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Request OTP Code</Text>
                    <Ionicons name="arrow-forward" size={18} color="#070913" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* Step 2: OTP Verification */
            <View style={styles.stepContainer}>
              <View style={styles.otpHeaderRow}>
                <Text style={styles.inputLabel}>Verification Passcode</Text>
                <TouchableOpacity onPress={() => setStep('PHONE')}>
                  <Text style={styles.changePhoneText}>Change number</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otp}
                onChangeText={setOtp}
                placeholder="000000"
                placeholderTextColor="#4b556b"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <Text style={styles.helperText}>
                Enter the 6-digit one-time code sent to {fullPhone}
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#070913" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={18} color="#070913" />
                    <Text style={styles.primaryButtonText}>Verify & Authorize Device</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleSendOtp}
                disabled={isLoading}
              >
                <Text style={styles.resendButtonText}>Didn't receive code? Resend OTP</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Security Footer */}
        <View style={styles.footer}>
          <MaterialCommunityIcons name="shield-key-outline" size={16} color="#55607a" />
          <Text style={styles.footerText}>
            256-bit encrypted payload • Native Android Telephony Engine
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070913',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d4af37',
  },
  badgeText: {
    color: '#d4af37',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  reraBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reraText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#0f1322',
    borderWidth: 1,
    borderColor: '#1e2640',
    borderRadius: 18,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  serverToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151b30',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 8,
  },
  serverToggleText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  serverInputGroup: {
    marginBottom: 16,
    backgroundColor: '#12172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#242f52',
  },
  stepContainer: {
    marginTop: 4,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodeBox: {
    backgroundColor: '#161c33',
    borderWidth: 1,
    borderColor: '#273356',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  input: {
    backgroundColor: '#161c33',
    borderWidth: 1,
    borderColor: '#273356',
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  phoneInput: {
    flex: 1,
    letterSpacing: 1,
  },
  otpInput: {
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
    color: '#d4af37',
    paddingVertical: 14,
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  changePhoneText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  helperText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 14,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  presetButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1a223f',
    borderWidth: 1,
    borderColor: '#2e3b68',
  },
  presetButtonActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: '#d4af37',
  },
  presetButtonText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  presetButtonTextActive: {
    color: '#d4af37',
  },
  primaryButton: {
    backgroundColor: '#d4af37',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#070913',
    fontSize: 15,
    fontWeight: '700',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  resendButtonText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#f87171',
    fontSize: 13,
    lineHeight: 18,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  successText: {
    flex: 1,
    color: '#34d399',
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
  },
  footerText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '500',
  },
});

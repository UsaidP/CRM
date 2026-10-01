/**
 * Expo Config Plugin: withCallMonitor
 * 
 * Injects the Android manifest entries required by the native call monitoring module:
 * - CallMonitorService (foreground service with phoneCall type)
 * - CallStateReceiver (PHONE_STATE broadcast receiver)
 * - BootReceiver (BOOT_COMPLETED broadcast receiver)
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withGradleWrapperUpdate(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const wrapperPath = path.join(
        config.modRequest.platformProjectRoot,
        'gradle',
        'wrapper',
        'gradle-wrapper.properties'
      );
      if (fs.existsSync(wrapperPath)) {
        let content = fs.readFileSync(wrapperPath, 'utf8');
        content = content.replace(/gradle-9\.[0-3]\.\d+-bin\.zip/g, 'gradle-9.4.1-bin.zip');
        fs.writeFileSync(wrapperPath, content, 'utf8');
      }
      return config;
    },
  ]);
}

function withCallMonitor(config) {
  config = withGradleWrapperUpdate(config);
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const mainApp = manifest.manifest.application?.[0];
    if (!mainApp) return config;

    // Ensure arrays exist
    if (!manifest.manifest['uses-permission']) manifest.manifest['uses-permission'] = [];
    if (!mainApp.service) mainApp.service = [];
    if (!mainApp.receiver) mainApp.receiver = [];

    // Explicitly guarantee call log & telephony permissions are registered
    const requiredPermissions = [
      'android.permission.READ_PHONE_STATE',
      'android.permission.READ_CALL_LOG',
      'android.permission.WRITE_CALL_LOG',
      'android.permission.READ_PHONE_NUMBERS',
      'android.permission.PROCESS_OUTGOING_CALLS',
    ];
    for (const perm of requiredPermissions) {
      const exists = manifest.manifest['uses-permission'].some(
        (p) => p.$?.['android:name'] === perm
      );
      if (!exists) {
        manifest.manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    }

    // 1. Add CallMonitorService (foreground service)
    const hasService = mainApp.service.some(
      (s) => s.$?.['android:name'] === 'expo.modules.callmonitor.CallMonitorService'
    );
    if (!hasService) {
      mainApp.service.push({
        $: {
          'android:name': 'expo.modules.callmonitor.CallMonitorService',
          'android:enabled': 'true',
          'android:exported': 'false',
          'android:foregroundServiceType': 'phoneCall',
        },
      });
    }

    // 2. Add BootReceiver
    const hasBootReceiver = mainApp.receiver.some(
      (r) => r.$?.['android:name'] === 'expo.modules.callmonitor.BootReceiver'
    );
    if (!hasBootReceiver) {
      mainApp.receiver.push({
        $: {
          'android:name': 'expo.modules.callmonitor.BootReceiver',
          'android:enabled': 'true',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
              { $: { 'android:name': 'android.intent.action.QUICKBOOT_POWERON' } },
            ],
          },
        ],
      });
    }

    // 3. Add CallStateReceiver
    const hasCallReceiver = mainApp.receiver.some(
      (r) => r.$?.['android:name'] === 'expo.modules.callmonitor.CallStateReceiver'
    );
    if (!hasCallReceiver) {
      mainApp.receiver.push({
        $: {
          'android:name': 'expo.modules.callmonitor.CallStateReceiver',
          'android:enabled': 'true',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.intent.action.PHONE_STATE' } },
            ],
          },
        ],
      });
    }

    return config;
  });
}

module.exports = withCallMonitor;

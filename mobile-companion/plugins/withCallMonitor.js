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
      // 1. Upgrade wrapper to 9.4.1 for AGP 9 support
      const wrapperPath = path.join(
        config.modRequest.platformProjectRoot,
        'gradle',
        'wrapper',
        'gradle-wrapper.properties'
      );
      if (fs.existsSync(wrapperPath)) {
        let content = fs.readFileSync(wrapperPath, 'utf8');
        content = content.replace(/gradle-[\d\.]+-bin\.zip/g, 'gradle-9.4.1-bin.zip');
        fs.writeFileSync(wrapperPath, content, 'utf8');
      }

      // 2. Set AGP 9 & Kotlin compatibility flags in gradle.properties
      const gradlePropsPath = path.join(
        config.modRequest.platformProjectRoot,
        'gradle.properties'
      );
      if (fs.existsSync(gradlePropsPath)) {
        let content = fs.readFileSync(gradlePropsPath, 'utf8');
        let changed = false;
        if (!content.includes('kotlin.suppressUnsupportedVersionErrors')) {
          content += '\nkotlin.suppressUnsupportedVersionErrors=true\n';
          changed = true;
        }
        if (!content.includes('android.builtInKotlin')) {
          content += 'android.builtInKotlin=false\n';
          changed = true;
        }
        if (!content.includes('android.newDsl')) {
          content += 'android.newDsl=false\n';
          changed = true;
        }
        if (!content.includes('android.sourceset.disallowProvider')) {
          content += 'android.sourceset.disallowProvider=false\n';
          changed = true;
        }
        if (content.includes('android.defaults.buildfeatures.buildconfig')) {
          content = content.replace(/android\.defaults\.buildfeatures\.buildconfig=.*\n?/g, '');
          changed = true;
        }
        if (changed) {
          fs.writeFileSync(gradlePropsPath, content, 'utf8');
        }
      }

      // Root android/build.gradle: ensure subprojects has buildFeatures.buildConfig = true for AGP 9
      const rootBuildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        'build.gradle'
      );
      if (fs.existsSync(rootBuildGradlePath)) {
        let content = fs.readFileSync(rootBuildGradlePath, 'utf8');
        if (!content.includes('buildConfig = true')) {
          content += `
subprojects { subproject ->
  subproject.plugins.withId("com.android.library") {
    subproject.android {
      buildFeatures {
        buildConfig = true
      }
    }
  }
  subproject.plugins.withId("com.android.application") {
    subproject.android {
      buildFeatures {
        buildConfig = true
      }
    }
  }
}
`;
          fs.writeFileSync(rootBuildGradlePath, content, 'utf8');
        }
      }

      // Guard app/build.gradle against duplicate kotlin plugin registration, update proguard file, and enable buildFeatures
      const appBuildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'build.gradle'
      );
      if (fs.existsSync(appBuildGradlePath)) {
        let content = fs.readFileSync(appBuildGradlePath, 'utf8');
        let changed = false;
        if (content.includes('apply plugin: "org.jetbrains.kotlin.android"') && !content.includes('findByName("kotlin")')) {
          content = content.replace(
            'apply plugin: "org.jetbrains.kotlin.android"',
            'if (project.extensions.findByName("kotlin") == null) {\n    apply plugin: "org.jetbrains.kotlin.android"\n}'
          );
          changed = true;
        }
        if (content.includes('proguard-android.txt')) {
          content = content.replace(/proguard-android\.txt/g, 'proguard-android-optimize.txt');
          changed = true;
        }
        if (!content.includes('buildFeatures {')) {
          content = content.replace(
            'compileSdk rootProject.ext.compileSdkVersion',
            'compileSdk rootProject.ext.compileSdkVersion\n\n    buildFeatures {\n        buildConfig = true\n    }'
          );
          changed = true;
        }
        if (changed) {
          fs.writeFileSync(appBuildGradlePath, content, 'utf8');
        }
      }

      // Add -dontoptimize to proguard-rules.pro for AGP 9 compatibility
      const proguardRulesPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );
      if (fs.existsSync(proguardRulesPath)) {
        let content = fs.readFileSync(proguardRulesPath, 'utf8');
        if (!content.includes('-dontoptimize')) {
          content += '\n# AGP 9 proguard-android-optimize compatibility\n-dontoptimize\n';
          fs.writeFileSync(proguardRulesPath, content, 'utf8');
        }
      }

      // 3. Patch autolinking plugin Kotlin version & compiler flags
      const autolinkingDir = path.join(
        config.modRequest.projectRoot,
        'node_modules/expo-modules-autolinking/android/expo-gradle-plugin'
      );
      if (fs.existsSync(autolinkingDir)) {
        const rootBuildKts = path.join(autolinkingDir, 'build.gradle.kts');
        if (fs.existsSync(rootBuildKts)) {
          let content = fs.readFileSync(rootBuildKts, 'utf8');
          content = content.replace(/version "2\.1\.\d+"/g, 'version "2.2.0"');
          if (!content.includes('-Xskip-metadata-version-check')) {
            content += `
subprojects {
  tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
    compilerOptions {
      freeCompilerArgs.add("-Xskip-metadata-version-check")
      freeCompilerArgs.add("-Xskip-prerelease-check")
    }
  }
}
`;
          }
          fs.writeFileSync(rootBuildKts, content, 'utf8');
        }

        const subprojects = [
          'expo-autolinking-settings-plugin',
          'expo-autolinking-plugin',
          'expo-max-sdk-override-plugin',
        ];

        for (const subproj of subprojects) {
          const subBuildKts = path.join(autolinkingDir, subproj, 'build.gradle.kts');
          if (fs.existsSync(subBuildKts)) {
            let content = fs.readFileSync(subBuildKts, 'utf8');
            if (!content.includes('-Xskip-metadata-version-check')) {
              content = content.replace(
                'jvmTarget.set(JvmTarget.JVM_11)',
                'jvmTarget.set(JvmTarget.JVM_11)\n    freeCompilerArgs.add("-Xskip-metadata-version-check")\n    freeCompilerArgs.add("-Xskip-prerelease-check")'
              );
              fs.writeFileSync(subBuildKts, content, 'utf8');
            }
          }
        }
      }

      // 4. Patch expo-dev-launcher and expo-modules-core Gradle plugins
      const standalonePlugins = [
        path.join(config.modRequest.projectRoot, 'node_modules/expo-dev-launcher/expo-dev-launcher-gradle-plugin/build.gradle.kts'),
        path.join(config.modRequest.projectRoot, 'node_modules/expo-modules-core/expo-module-gradle-plugin/build.gradle.kts'),
      ];
      for (const pluginKts of standalonePlugins) {
        if (fs.existsSync(pluginKts)) {
          let content = fs.readFileSync(pluginKts, 'utf8');
          const original = content;
          content = content.replace(/version "2\.1\.\d+"/g, 'version "2.2.0"');
          if (!content.includes('-Xskip-metadata-version-check')) {
            content = content.replace(
              'jvmTarget.set(JvmTarget.JVM_11)',
              'jvmTarget.set(JvmTarget.JVM_11)\n    freeCompilerArgs.add("-Xskip-metadata-version-check")\n    freeCompilerArgs.add("-Xskip-prerelease-check")'
            );
          }
          if (content !== original) {
            fs.writeFileSync(pluginKts, content, 'utf8');
          }
        }
      }

      // 5. Patch AndroidLibraryExtension.kt and ExpoModulesCorePlugin.gradle for AGP 9
      const androidLibraryExtKt = path.join(
        config.modRequest.projectRoot,
        'node_modules/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/android/AndroidLibraryExtension.kt'
      );
      if (fs.existsSync(androidLibraryExtKt)) {
        let content = fs.readFileSync(androidLibraryExtKt, 'utf8');
        let changed = false;
        if (content.includes('this@defaultConfig.targetSdk = targetSdk')) {
          content = content.replace(/this@defaultConfig\.targetSdk\s*=\s*targetSdk/g, '// this@defaultConfig.targetSdk = targetSdk (removed in AGP 9)');
          changed = true;
        }
        if (!content.includes('buildFeatures {')) {
          content = content.replace(
            '// this@defaultConfig.targetSdk = targetSdk (removed in AGP 9)\n  }',
            '// this@defaultConfig.targetSdk = targetSdk (removed in AGP 9)\n  }\n  buildFeatures {\n    buildConfig = true\n  }'
          );
          changed = true;
        }
        if (changed) {
          fs.writeFileSync(androidLibraryExtKt, content, 'utf8');
        }
      }

      const expoModulesCorePluginGradle = path.join(
        config.modRequest.projectRoot,
        'node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle'
      );
      if (fs.existsSync(expoModulesCorePluginGradle)) {
        let content = fs.readFileSync(expoModulesCorePluginGradle, 'utf8');
        let changed = false;
        if (content.includes('targetSdkVersion project.ext.safeExtGet')) {
          content = content.replace(/targetSdkVersion project\.ext\.safeExtGet.*$/m, '// targetSdkVersion removed for AGP 9');
          changed = true;
        }
        if (!content.includes('buildFeatures {')) {
          content = content.replace(
            '// targetSdkVersion removed for AGP 9\n    }',
            '// targetSdkVersion removed for AGP 9\n    }\n\n    buildFeatures {\n      buildConfig = true\n    }'
          );
          changed = true;
        }
        if (changed) {
          fs.writeFileSync(expoModulesCorePluginGradle, content, 'utf8');
        }
      }

      // Patch ProjectConfiguration.kt to avoid SoftwareComponent 'release' not found crash
      const projectConfigKt = path.join(
        config.modRequest.projectRoot,
        'node_modules/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/ProjectConfiguration.kt'
      );
      if (fs.existsSync(projectConfigKt)) {
        let content = fs.readFileSync(projectConfigKt, 'utf8');
        if (!content.includes('components.findByName("release") == null')) {
          content = content.replace(
            'afterEvaluate {\n    val publicationInfo = PublicationInfo(this)',
            'afterEvaluate {\n    if (project.components.findByName("release") == null) {\n      createEmptyExpoPublishTask()\n      createEmptyExpoPublishToMavenLocalTask()\n      return@afterEvaluate\n    }\n    val publicationInfo = PublicationInfo(this)'
          );
          fs.writeFileSync(projectConfigKt, content, 'utf8');
        }
      }

      // Patch @expo/log-box/android/build.gradle directly with buildFeatures.buildConfig = true
      const expoLogBoxBuildGradle = path.join(
        config.modRequest.projectRoot,
        'node_modules/@expo/log-box/android/build.gradle'
      );
      if (fs.existsSync(expoLogBoxBuildGradle)) {
        let content = fs.readFileSync(expoLogBoxBuildGradle, 'utf8');
        if (!content.includes('buildFeatures {')) {
          content = content.replace(
            'namespace "expo.modules.logbox"',
            'namespace "expo.modules.logbox"\n  buildFeatures {\n    buildConfig = true\n  }'
          );
          fs.writeFileSync(expoLogBoxBuildGradle, content, 'utf8');
        }
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
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
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

    // 1. Add or update CallMonitorService (foreground service)
    const existingService = mainApp.service.find(
      (s) => s.$?.['android:name'] === 'expo.modules.callmonitor.CallMonitorService'
    );
    if (existingService) {
      existingService.$['android:foregroundServiceType'] = 'dataSync';
      existingService.$['android:enabled'] = 'true';
      existingService.$['android:exported'] = 'false';
    } else {
      mainApp.service.push({
        $: {
          'android:name': 'expo.modules.callmonitor.CallMonitorService',
          'android:enabled': 'true',
          'android:exported': 'false',
          'android:foregroundServiceType': 'dataSync',
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

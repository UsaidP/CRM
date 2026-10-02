const fs = require('fs');
const path = require('path');

const rnDir = path.resolve(__dirname, '../node_modules/react-native');
const polyPath = path.join(rnDir, 'rn-get-polyfills.js');
const pkgPath = path.join(rnDir, 'package.json');

if (fs.existsSync(rnDir)) {
  if (!fs.existsSync(polyPath)) {
    fs.writeFileSync(polyPath, "module.exports = require('@react-native/js-polyfills');\n");
  }
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.exports && !pkg.exports['./rn-get-polyfills']) {
        pkg.exports['./rn-get-polyfills'] = './rn-get-polyfills.js';
        pkg.exports['./rn-get-polyfills.js'] = './rn-get-polyfills.js';
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      }
    } catch (e) {
      console.warn('[patch-rn] Notice:', e.message);
    }
  }
}

// 2. Patch expo-modules-autolinking Gradle plugin to align with Kotlin 2.2.0 and AGP 9
const autolinkingDir = path.resolve(__dirname, '../node_modules/expo-modules-autolinking/android/expo-gradle-plugin');
if (fs.existsSync(autolinkingDir)) {
  const rootBuildKts = path.join(autolinkingDir, 'build.gradle.kts');
  if (fs.existsSync(rootBuildKts)) {
    let content = fs.readFileSync(rootBuildKts, 'utf8');
    const original = content;
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
    if (content !== original) {
      fs.writeFileSync(rootBuildKts, content, 'utf8');
      console.log('[patch-rn] Patched expo-gradle-plugin/build.gradle.kts with Kotlin 2.2.0 and compiler flags');
    }
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
        console.log(`[patch-rn] Patched ${subproj}/build.gradle.kts with compilerOptions`);
      }
    }
  }
}

// 3. Patch expo-dev-launcher and expo-modules-core Gradle plugins for Kotlin 2.2.0 compatibility
function patchStandaloneGradlePlugin(pluginPath, name) {
  if (fs.existsSync(pluginPath)) {
    let content = fs.readFileSync(pluginPath, 'utf8');
    const original = content;
    content = content.replace(/version "2\.1\.\d+"/g, 'version "2.2.0"');
    if (!content.includes('-Xskip-metadata-version-check')) {
      content = content.replace(
        'jvmTarget.set(JvmTarget.JVM_11)',
        'jvmTarget.set(JvmTarget.JVM_11)\n    freeCompilerArgs.add("-Xskip-metadata-version-check")\n    freeCompilerArgs.add("-Xskip-prerelease-check")'
      );
    }
    if (content !== original) {
      fs.writeFileSync(pluginPath, content, 'utf8');
      console.log(`[patch-rn] Patched ${name} with Kotlin 2.2.0 and compiler flags`);
    }
  }
}

const devLauncherPluginKts = path.resolve(
  __dirname,
  '../node_modules/expo-dev-launcher/expo-dev-launcher-gradle-plugin/build.gradle.kts'
);
patchStandaloneGradlePlugin(devLauncherPluginKts, 'expo-dev-launcher-gradle-plugin');

const expoModulesCorePluginKts = path.resolve(
  __dirname,
  '../node_modules/expo-modules-core/expo-module-gradle-plugin/build.gradle.kts'
);
patchStandaloneGradlePlugin(expoModulesCorePluginKts, 'expo-module-gradle-plugin');

// Patch AndroidLibraryExtension.kt and ExpoModulesCorePlugin.gradle to remove targetSdk on library modules for AGP 9
const androidLibraryExtKt = path.resolve(
  __dirname,
  '../node_modules/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/android/AndroidLibraryExtension.kt'
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
    console.log('[patch-rn] Patched AndroidLibraryExtension.kt for AGP 9 (removed targetSdk, added buildFeatures)');
  }
}

const expoModulesCorePluginGradle = path.resolve(
  __dirname,
  '../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle'
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
    console.log('[patch-rn] Patched ExpoModulesCorePlugin.gradle for AGP 9 (removed targetSdkVersion, added buildFeatures)');
  }
}

// Patch ProjectConfiguration.kt to avoid SoftwareComponent 'release' not found crash
const projectConfigKt = path.resolve(
  __dirname,
  '../node_modules/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/ProjectConfiguration.kt'
);
if (fs.existsSync(projectConfigKt)) {
  let content = fs.readFileSync(projectConfigKt, 'utf8');
  if (!content.includes('components.findByName("release") == null')) {
    content = content.replace(
      'afterEvaluate {\n    val publicationInfo = PublicationInfo(this)',
      'afterEvaluate {\n    if (project.components.findByName("release") == null) {\n      createEmptyExpoPublishTask()\n      createEmptyExpoPublishToMavenLocalTask()\n      return@afterEvaluate\n    }\n    val publicationInfo = PublicationInfo(this)'
    );
    fs.writeFileSync(projectConfigKt, content, 'utf8');
    console.log('[patch-rn] Patched ProjectConfiguration.kt with release component safeguard');
  }
}

// Patch @expo/log-box/android/build.gradle directly with buildFeatures.buildConfig = true
const expoLogBoxBuildGradle = path.resolve(
  __dirname,
  '../node_modules/@expo/log-box/android/build.gradle'
);
if (fs.existsSync(expoLogBoxBuildGradle)) {
  let content = fs.readFileSync(expoLogBoxBuildGradle, 'utf8');
  if (!content.includes('buildFeatures {')) {
    content = content.replace(
      'namespace "expo.modules.logbox"',
      'namespace "expo.modules.logbox"\n  buildFeatures {\n    buildConfig = true\n  }'
    );
    fs.writeFileSync(expoLogBoxBuildGradle, content, 'utf8');
    console.log('[patch-rn] Patched @expo/log-box/android/build.gradle with buildFeatures.buildConfig = true');
  }
}

// 4. Ensure android/gradle.properties, android/build.gradle, and android/app/build.gradle have AGP 9 compatibility flags
const gradleProps = path.resolve(__dirname, '../android/gradle.properties');
if (fs.existsSync(gradleProps)) {
  let content = fs.readFileSync(gradleProps, 'utf8');
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
  if (content.includes('android.defaults.buildfeatures.buildconfig')) {
    content = content.replace(/android\.defaults\.buildfeatures\.buildconfig=.*\n?/g, '');
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(gradleProps, content, 'utf8');
    console.log('[patch-rn] Cleaned AGP 9 compatibility flags in android/gradle.properties');
  }
}

const rootBuildGradle = path.resolve(__dirname, '../android/build.gradle');
if (fs.existsSync(rootBuildGradle)) {
  let content = fs.readFileSync(rootBuildGradle, 'utf8');
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
    fs.writeFileSync(rootBuildGradle, content, 'utf8');
    console.log('[patch-rn] Added subprojects buildFeatures block to android/build.gradle');
  }
}

const appBuildGradle = path.resolve(__dirname, '../android/app/build.gradle');
if (fs.existsSync(appBuildGradle)) {
  let content = fs.readFileSync(appBuildGradle, 'utf8');
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
    fs.writeFileSync(appBuildGradle, content, 'utf8');
    console.log('[patch-rn] Updated android/app/build.gradle with kotlin guard, proguard-android-optimize.txt, and buildFeatures');
  }
}

const proguardRules = path.resolve(__dirname, '../android/app/proguard-rules.pro');
if (fs.existsSync(proguardRules)) {
  let content = fs.readFileSync(proguardRules, 'utf8');
  if (!content.includes('-dontoptimize')) {
    content += '\n# AGP 9 proguard-android-optimize compatibility\n-dontoptimize\n';
    fs.writeFileSync(proguardRules, content, 'utf8');
    console.log('[patch-rn] Added -dontoptimize to android/app/proguard-rules.pro');
  }
}




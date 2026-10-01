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



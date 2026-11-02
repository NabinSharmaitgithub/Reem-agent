const { AndroidConfig, withAndroidManifest } = require("expo/config-plugins");

/**
 * Registers the Wake Word detection module:
 *
 * 1. Adds RECORD_AUDIO permission (already in app.json, asserted here).
 *
 * WakeWordModule is a plain Expo module, not an Android Service: audio capture
 * runs inside the app process while it is alive, so there is nothing to declare
 * in the manifest beyond the microphone permission.
 */
function addWakeWord(androidManifest) {
  const appEntry = androidManifest.manifest.application?.[0];
  if (!appEntry) return androidManifest;

  const permissions =
    androidManifest.manifest["uses-permission"] || [];
  const names = new Set(permissions.map((p) => p["$"]["android:name"]));

  if (!names.has("android.permission.RECORD_AUDIO")) {
    permissions.push({ $: { "android:name": "android.permission.RECORD_AUDIO" } });
  }
  androidManifest.manifest["uses-permission"] = permissions;

  return androidManifest;
}

module.exports = function withWakeWord(config) {
  return withAndroidManifest(config, (config) => {
    config.modResults = addWakeWord(config.modResults);
    return config;
  });
};

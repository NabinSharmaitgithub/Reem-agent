const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Registers the Reem device-automation native module:
 *
 * 1. Declares DeviceAccessibilityService in AndroidManifest with the
 *    accessibility-service intent filter and meta-data pointing at the
 *    accessibility-service XML config.
 * 2. Adds permissions needed for automation: SYSTEM_ALERT_WINDOW (floating
 *    button/overlay), RECORD_AUDIO + RECOGNIZE_SPEECH (voice), QUERY_ALL_PACKAGES
 *    (app discovery), POST_NOTIFICATIONS (notifications).
 *
 * The user must still manually enable the Accessibility Service in
 * Settings → Accessibility → Reem — Android does not allow apps to self-grant
 * BIND_ACCESSIBILITY_SERVICE.
 */
function addDeviceAutomation(androidManifest) {
  const appEntry = androidManifest.manifest.application?.[0];
  if (!appEntry) return androidManifest;

  const permissions = [
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.RECORD_AUDIO",
    "android.permission.RECOGNIZE_SPEECH",
    "android.permission.QUERY_ALL_PACKAGES",
    "android.permission.POST_NOTIFICATIONS",
  ];

  const existing =
    androidManifest.manifest["uses-permission"] || [];
  const names = new Set(existing.map((p) => p["$"]["android:name"]));

  for (const permission of permissions) {
    if (!names.has(permission)) {
      existing.push({ $: { "android:name": permission } });
      names.add(permission);
    }
  }
  androidManifest.manifest["uses-permission"] = existing;

  // Register the accessibility service.
  const services = appEntry["service"] || [];
  const serviceName = "expo.modules.deviceautomation.DeviceAccessibilityService";

  if (!services.some((s) => s["$"]["android:name"] === serviceName)) {
    services.push({
      $: {
        "android:name": serviceName,
        "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE",
        // The system binds this service from another UID; only the system
        // holds BIND_ACCESSIBILITY_SERVICE, so exported + the permission is
        // the documented, safe configuration.
        "android:exported": "true",
        "android:label": "Reem Automation",
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": "android.accessibilityservice.AccessibilityService" } }],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.accessibilityservice",
            "android:resource": "@xml/device_automation_accessibility_service",
          },
        },
      ],
    });
  }
  appEntry["service"] = services;

  return androidManifest;
}

/**
 * The accessibility-service XML resource and its description string live in
 * modules/device-automation/android/src/main/res/ — the native module ships
 * them itself, so no app-level duplicates are needed (app resources would
 * override the module's).
 */
module.exports = function withDeviceAutomation(config) {
  config = withAndroidManifest(config, (c) => {
    c.modResults = addDeviceAutomation(c.modResults);
    return c;
  });

  return config;
};

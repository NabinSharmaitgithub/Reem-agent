const { AndroidConfig, withAndroidManifest } = require("expo/config-plugins");

/**
 * Registers the NotificationListenerService used for trigger-based
 * automation:
 *
 * 1. Declares NotificationTriggerListener with BIND_NOTIFICATION_LISTENER_SERVICE.
 * 2. The user must still enable "Notification access" for Reem in settings —
 *    Android does not allow self-granting this permission.
 */
function addNotificationTrigger(androidManifest) {
  const appEntry = androidManifest.manifest.application?.[0];
  if (!appEntry) return androidManifest;

  const permissions =
    androidManifest.manifest["uses-permission"] || [];
  const names = new Set(permissions.map((p) => p["$"]["android:name"]));

  if (!names.has("android.permission.POST_NOTIFICATIONS")) {
    permissions.push({ $: { "android:name": "android.permission.POST_NOTIFICATIONS" } });
  }
  androidManifest.manifest["uses-permission"] = permissions;

  const services = appEntry["service"] || [];
  const serviceName = "expo.modules.notificationtrigger.NotificationTriggerListener";

  if (!services.some((s) => s["$"]["android:name"] === serviceName)) {
    services.push({
      $: {
        "android:name": serviceName,
        "android:permission": "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
        // Bound by the system (different UID); the BIND permission ensures
        // no other app can bind even though the service is exported.
        "android:exported": "true",
        "android:label": "Reem Notification Triggers",
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": "android.service.notification.NotificationListenerService" } }],
        },
      ],
    });
  }
  appEntry["service"] = services;

  return androidManifest;
}

module.exports = function withNotificationTrigger(config) {
  return withAndroidManifest(config, (config) => {
    config.modResults = addNotificationTrigger(config.modResults);
    return config;
  });
};

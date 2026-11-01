const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Registers the Floating Panda Button:
 *
 * 1. Declares FloatingButtonService (overlay, SYSTEM_ALERT_WINDOW consumer)
 *    as a special-use foreground service so Android 8+ keeps it alive and
 *    Android 14+ accepts the foreground notification it posts.
 * 2. Adds SYSTEM_ALERT_WINDOW permission if not already present.
 *
 * The user must still grant "Display over other apps" in settings — Android
 * does not allow self-granting SYSTEM_ALERT_WINDOW.
 */
function addFloatingButton(androidManifest) {
  const appEntry = androidManifest.manifest.application?.[0];
  if (!appEntry) return androidManifest;

  const permissions = androidManifest.manifest["uses-permission"] || [];
  const names = new Set(permissions.map((p) => p["$"]["android:name"]));

  const requiredPermissions = [
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
  ];
  for (const permission of requiredPermissions) {
    if (!names.has(permission)) {
      permissions.push({ $: { "android:name": permission } });
    }
  }
  androidManifest.manifest["uses-permission"] = permissions;

  const services = appEntry["service"] || [];
  const serviceName = "expo.modules.floatingbutton.FloatingButtonService";

  if (!services.some((s) => s["$"]["android:name"] === serviceName)) {
    services.push({
      $: {
        "android:name": serviceName,
        "android:exported": "false",
        "android:foregroundServiceType": "specialUse",
      },
      property: [
        {
          $: {
            "android:name": "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE",
            "android:value": "floating assistant overlay button",
          },
        },
      ],
    });
  }
  appEntry["service"] = services;

  return androidManifest;
}

module.exports = function withFloatingButton(config) {
  return withAndroidManifest(config, (config) => {
    config.modResults = addFloatingButton(config.modResults);
    return config;
  });
};

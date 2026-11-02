const { AndroidConfig, withAndroidManifest } = require("expo/config-plugins");

/**
 * Registers the TriggerDispatch broadcast receiver:
 *
 * 1. Declares TriggerBroadcastReceiver to catch
 *    `expo.modules.notificationtrigger.NOTIFICATION_POSTED` broadcasts
 *    from NotificationTriggerListener.
 * 2. When a matching notification arrives, the receiver starts a headless
 *    JS task (TriggerDispatchTask) that checks enabled triggers and
 *    dispatches agent runs.
 */
function addTriggerDispatch(androidManifest) {
  const appEntry = androidManifest.manifest.application?.[0];
  if (!appEntry) return androidManifest;

  const receivers = appEntry["receiver"] || [];
  const receiverName = "expo.modules.triggerdispatch.TriggerBroadcastReceiver";

  if (!receivers.some((r) => r["$"]["android:name"] === receiverName)) {
    receivers.push({
      $: {
        "android:name": receiverName,
        "android:exported": "false",
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": "expo.modules.notificationtrigger.NOTIFICATION_POSTED" } }],
        },
      ],
    });
  }
  appEntry["receiver"] = receivers;

  return androidManifest;
}

module.exports = function withTriggerDispatch(config) {
  return withAndroidManifest(config, (config) => {
    config.modResults = addTriggerDispatch(config.modResults);
    return config;
  });
};

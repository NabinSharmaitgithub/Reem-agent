const { AndroidConfig, withAndroidManifest } = require("expo/config-plugins");

/**
 * Registers Reem as a candidate default assistant app:
 *
 * 1. Declares AssistEntryActivity with ACTION_ASSIST intent filter — this is what
 *    the system launches when the user long-presses home or invokes the assistant.
 * 2. The user must still go to Settings → Apps → Default apps → Digital assistant
 *    app and select Reem — Android does not allow self-assignment of ROLE_ASSISTANT.
 */
function addDefaultAssistant(androidManifest) {
  const appEntry = androidManifest.manifest.application?.[0];
  if (!appEntry) return androidManifest;

  // Declare the dedicated AssistEntryActivity for handling assist intents.
  const activities = appEntry["activity"] || [];
  const assistActivityName = "expo.modules.defaultassistant.AssistEntryActivity";

  if (!activities.some((a) => a["$"]["android:name"] === assistActivityName)) {
    activities.push({
      $: {
        "android:name": assistActivityName,
        "android:exported": "true",
        "android:theme": "@android:style/Theme.Translucent.NoTitleBar",
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": "android.intent.action.ASSIST" } }],
          category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
        },
      ],
    });
  }
  appEntry["activity"] = activities;

  return androidManifest;
}

module.exports = function withDefaultAssistant(config) {
  return withAndroidManifest(config, (config) => {
    config.modResults = addDefaultAssistant(config.modResults);
    return config;
  });
};

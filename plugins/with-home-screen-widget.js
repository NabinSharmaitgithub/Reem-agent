const { withAndroidManifest, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Registers the Reem home screen widget:
 *
 * 1. Declares HomeScreenWidgetProvider in AndroidManifest with the
 *    appwidget intent filter and meta-data pointing at the widget info XML.
 * 2. Mirrors the widget info XML and string resources from the native module
 *    into the app's res/ directory.
 *
 * The provider is `exported="true"`: AppWidgetManager runs in a different
 * process (uid 1000) and delivers APPWIDGET_UPDATE from there, so a
 * non-exported receiver would never be updated.
 */
function addHomeScreenWidget(androidManifest) {
  const appEntry = androidManifest.manifest.application?.[0];
  if (!appEntry) return androidManifest;

  const receivers = appEntry["receiver"] || [];
  const receiverName = "expo.modules.homescreenwidget.HomeScreenWidgetProvider";

  if (!receivers.some((r) => r["$"]["android:name"] === receiverName)) {
    receivers.push({
      $: {
        "android:name": receiverName,
        "android:exported": "true",
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } }],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.appwidget.provider",
            "android:resource": "@xml/home_screen_widget_info",
          },
        },
      ],
    });
  }
  appEntry["receiver"] = receivers;

  return androidManifest;
}

/**
 * Mirrors the home screen widget XML resources from the native module into the
 * app's res/ directory.
 *
 * Only the `xml/` folder is copied verbatim. Values files are written under a
 * `widget_` prefixed filename so the app's own `values/strings.xml` is never
 * overwritten (the config plugin runs before Expo finishes writing it).
 */
function withWidgetResources(config) {
  return withDangerousMod(config, [
    "android",
    async (c) => {
      const moduleResDir = path.join(
        c.modRequest.projectRoot,
        "modules",
        "home-screen-widget",
        "android",
        "src",
        "main",
        "res",
      );
      const appResDir = path.join(
        c.modRequest.projectRoot,
        "android",
        "app",
        "src",
        "main",
        "res",
      );

      const xmlSrc = path.join(moduleResDir, "xml");
      const xmlDst = path.join(appResDir, "xml");
      if (fs.existsSync(xmlSrc)) {
        fs.mkdirSync(xmlDst, { recursive: true });
        for (const file of fs.readdirSync(xmlSrc)) {
          fs.copyFileSync(path.join(xmlSrc, file), path.join(xmlDst, file));
        }
      }

      const valuesSrc = path.join(moduleResDir, "values");
      const valuesDst = path.join(appResDir, "values");
      if (fs.existsSync(valuesSrc)) {
        fs.mkdirSync(valuesDst, { recursive: true });
        for (const file of fs.readdirSync(valuesSrc)) {
          fs.copyFileSync(
            path.join(valuesSrc, file),
            path.join(valuesDst, `widget_${file}`),
          );
        }
      }

      return c;
    },
  ]);
}

module.exports = function withHomeScreenWidget(config) {
  config = withAndroidManifest(config, (config) => {
    config.modResults = addHomeScreenWidget(config.modResults);
    return config;
  });

  config = withWidgetResources(config);

  return config;
};

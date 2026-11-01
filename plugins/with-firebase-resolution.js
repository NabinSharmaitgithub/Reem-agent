const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Fix duplicate class com.google.firebase.Timestamp found in both
 * firebase-common:22.0.1 and firebase-firestore:24.10.1 (BOM 32.7.1).
 * Exclude the Timestamp copy from firebase-firestore by adding excludes
 * inside the android { packagingOptions { ... } } block.
 */
module.exports = function withFirebaseResolution(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes("com/google/firebase/Timestamp.class")) {
      return config; // already applied
    }

    const excludes = `        exclude 'com/google/firebase/Timestamp.class'
        exclude 'com/google/firebase/Timestamp\$*.class'
`;

    const pkgIdx = contents.indexOf("packagingOptions {");
    if (pkgIdx >= 0) {
      // Insert excludes right after the packagingOptions { opening line.
      const openEnd = contents.indexOf("\n", pkgIdx);
      if (openEnd >= 0) {
        config.modResults.contents =
          contents.slice(0, openEnd + 1) +
          excludes +
          contents.slice(openEnd + 1);
        return config;
      }
    }

    // packagingOptions block doesn't exist yet; inject one inside android { ... }
    const androidIdx = contents.indexOf("android {");
    if (androidIdx >= 0) {
      const openEnd = contents.indexOf("\n", androidIdx);
      if (openEnd >= 0) {
        const packagingBlock = `  packagingOptions {\n${excludes}  }\n`;
        config.modResults.contents =
          contents.slice(0, openEnd + 1) +
          packagingBlock +
          contents.slice(openEnd + 1);
        return config;
      }
    }

    return config;
  });
};

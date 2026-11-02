const { withProjectBuildGradle } = require("expo/config-plugins");

/**
 * Firebase dependency alignment.
 *
 * 1. Expo Notifications pulls firebase-messaging 25.x, which resolves
 *    firebase-common 22.0.1. React Native Firebase 18.9.0's own BoM otherwise
 *    selects firebase-firestore 24.10.1, which bundles a second copy of
 *    com.google.firebase.Timestamp and breaks :app:checkReleaseDuplicateClasses.
 *    Forcing Firestore onto the matching 26.x line removes the duplicate.
 *
 * 2. firebase-firestore 25+ no longer depends on Guava, but RN Firebase 18.9.0
 *    still compiles ReactNativeFirebaseFirestoreSerialize against
 *    com.google.common.collect.Iterables. Add Guava back to that module only.
 */
const MARKER = "// Firebase Firestore aligned with Expo Notifications";
const GUAVA_MARKER = "// guava for react-native-firebase 18.x firestore sources";

module.exports = function withFirebaseResolution(config) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes(MARKER)) {
      return config;
    }

    const snippet = `
allprojects {
  ${MARKER}
  configurations.configureEach {
    resolutionStrategy.force("com.google.firebase:firebase-firestore:26.0.2")
  }
}

allprojects { project ->
  if (project.name == "react-native-firebase_firestore") {
    project.plugins.withId("com.android.library") {
      ${GUAVA_MARKER}
      project.dependencies.add("implementation", "com.google.guava:guava:32.1.3-android")
    }
  }
}
`;

    config.modResults.contents = `${contents.trimEnd()}\n${snippet}`;

    return config;
  });
};

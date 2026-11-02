import firebase from "@react-native-firebase/app";
import "@react-native-firebase/auth";
import "@react-native-firebase/firestore";
import "@react-native-firebase/remote-config";

// React Native Firebase initializes its default app from the native Google
// Services files. The default app cannot be initialized from JavaScript.
const app = firebase.app();
export const auth = app.auth();
export const db = app.firestore();
export const remoteConfig = app.remoteConfig();

export function initializeFirebase() {
  void remoteConfig.setDefaults({
    developer_message: "Reem is an experimental AI assistant. Use with care.",
    pro_feature_enabled: "false",
    wake_word_enabled: "false",
    daily_free_limit: "15",
    gemini_api_endpoint: "",
    gcs_bucket_name: "",
    max_daily_tasks: "15",
    maintenance_mode: "false",
  });
  return { app, auth, db, remoteConfig };
}

export default { initializeFirebase, app, auth, db, remoteConfig };

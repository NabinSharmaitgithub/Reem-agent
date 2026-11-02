/**
 * Firestore service
 *
 * Manages Firestore collections for users, settings, task history,
 * developer messages, and other cloud-synced data.
 */

import { db } from "@/modules/auth/firebase";
import firestore from "@react-native-firebase/firestore";
const serverTimestamp = () => firestore.FieldValue.serverTimestamp();

export type UserProfile = {
  uid: string;
  email?: string;
  displayName?: string;
  role: "free" | "pro";
  dailyTasksUsed: number;
  dailyTasksLimit: number;
  lastTaskDate: string;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type TaskHistoryEntry = {
  id: string;
  title: string;
  status: "completed" | "failed" | "canceled";
  startedAt: string;
  completedAt?: string;
  error?: string;
  toolCount: number;
  modelId?: string;
  providerId?: string;
};

export type DeveloperMessage = {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "update";
  version?: string;
  dismissible: boolean;
  createdAt: string;
  expiresAt?: string;
};

export type AppSetting = {
  key: string;
  value: any;
  updatedAt: string;
};

export class FirestoreService {
  private readonly COLLECTIONS = {
    users: "users",
    taskHistory: "taskHistory",
    developerMessages: "developerMessages",
    appSettings: "appSettings",
  };

  // ── User Profile ──────────────────────────────────────────────

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docSnap = await db.collection(this.COLLECTIONS.users).doc(uid).get();
      if (docSnap.exists) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error("FirestoreService: getUserProfile failed:", error);
      return null;
    }
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      await db.collection(this.COLLECTIONS.users).doc(profile.uid).set(
        {
          ...profile,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      console.error("FirestoreService: saveUserProfile failed:", error);
      throw error;
    }
  }

  async incrementTaskUsage(uid: string): Promise<void> {
    try {
      await db.collection(this.COLLECTIONS.users).doc(uid).update({
        dailyTasksUsed: serverTimestamp(), // Will be handled server-side
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("FirestoreService: incrementTaskUsage failed:", error);
      throw error;
    }
  }

  // ── Task History ──────────────────────────────────────────────

  async getTaskHistory(uid: string, limit = 50): Promise<TaskHistoryEntry[]> {
    try {
      const snapshot = await db.collection(this.COLLECTIONS.taskHistory)
        .where("uid", "==", uid).orderBy("startedAt", "desc").limit(limit).get();
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as TaskHistoryEntry,
      );
    } catch (error) {
      console.error("FirestoreService: getTaskHistory failed:", error);
      return [];
    }
  }

  async saveTaskHistory(
    entry: TaskHistoryEntry & { uid: string },
  ): Promise<void> {
    try {
      await db.collection(this.COLLECTIONS.taskHistory).add({
        ...entry,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("FirestoreService: saveTaskHistory failed:", error);
      throw error;
    }
  }

  // ── Developer Messages ────────────────────────────────────────

  async getDeveloperMessages(): Promise<DeveloperMessage[]> {
    try {
      const snapshot = await db.collection(this.COLLECTIONS.developerMessages)
        .orderBy("createdAt", "desc").limit(20).get();
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as DeveloperMessage,
      );
    } catch (error) {
      console.error("FirestoreService: getDeveloperMessages failed:", error);
      return [];
    }
  }

  async saveDeveloperMessage(message: DeveloperMessage): Promise<void> {
    try {
      await db.collection(this.COLLECTIONS.developerMessages).add({
        ...message,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("FirestoreService: saveDeveloperMessage failed:", error);
      throw error;
    }
  }

  // ── App Settings ──────────────────────────────────────────────

  async getAppSetting(key: string): Promise<any> {
    try {
      const docSnap = await db.collection(this.COLLECTIONS.appSettings).doc(key).get();
      if (docSnap.exists) {
        return docSnap.data()?.value;
      }
      return null;
    } catch (error) {
      console.error("FirestoreService: getAppSetting failed:", error);
      return null;
    }
  }

  async saveAppSetting(key: string, value: any): Promise<void> {
    try {
      await db.collection(this.COLLECTIONS.appSettings).doc(key).set(
        {
          key,
          value,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      console.error("FirestoreService: saveAppSetting failed:", error);
      throw error;
    }
  }

  // ── Real-time subscriptions ───────────────────────────────────

  subscribeToUserProfile(
    uid: string,
    callback: (profile: UserProfile | null) => void,
  ) {
    return db.collection(this.COLLECTIONS.users).doc(uid).onSnapshot((docSnap) => {
      if (docSnap.exists) {
        callback(docSnap.data() as UserProfile);
      } else {
        callback(null);
      }
    });
  }

  subscribeToTaskHistory(
    uid: string,
    callback: (entries: TaskHistoryEntry[]) => void,
  ) {
    return db.collection(this.COLLECTIONS.taskHistory)
      .where("uid", "==", uid).orderBy("startedAt", "desc").limit(50).onSnapshot((snapshot) => {
      callback(
        snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as TaskHistoryEntry,
        ),
      );
    });
  }

  subscribeToDeveloperMessages(
    callback: (messages: DeveloperMessage[]) => void,
  ) {
    return db.collection(this.COLLECTIONS.developerMessages)
      .orderBy("createdAt", "desc").limit(20).onSnapshot((snapshot) => {
      callback(
        snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as DeveloperMessage,
        ),
      );
    });
  }
}

// Singleton instance
let firestoreServiceInstance: FirestoreService | null = null;

export function getFirestoreService(): FirestoreService {
  if (!firestoreServiceInstance) {
    firestoreServiceInstance = new FirestoreService();
  }
  return firestoreServiceInstance;
}

export default FirestoreService;

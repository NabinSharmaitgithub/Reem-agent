import { auth, initializeFirebase } from "@/modules/auth/firebase";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Alert } from "react-native";

export type UserRole = "free" | "pro";

export type ReemUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  dailyTasksUsed: number;
  dailyTasksLimit: number;
  lastTaskDate: string;
  createdAt: string;
  updatedAt: string;
};

type AuthContextType = {
  user: ReemUser | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signInAnonymously: () => Promise<ReemUser>;
  signInWithEmail: (email: string, password: string) => Promise<ReemUser>;
  registerWithEmail: (email: string, password: string) => Promise<ReemUser>;
  signOut: () => Promise<void>;
  incrementTaskCount: () => Promise<boolean>;
  canPerformTask: () => boolean;
  resetDailyTasks: () => Promise<void>;
  upgradeToPro: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ReemUser | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  const initialize = useCallback(async () => {
    // Register the auth-state listener exactly once so repeated effect runs
    // don't stack subscriptions or re-initialize Firebase.
    if (initRef.current) return;
    initRef.current = true;
    try {
      initializeFirebase();
      auth.onAuthStateChanged(async (firebaseUser: any) => {
        try {
          if (firebaseUser) {
            const userData = await getOrCreateUser(firebaseUser);
            setUser(userData);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error("[Auth] Auth state handler failed:", error);
        } finally {
          setLoading(false);
        }
      });
    } catch (error) {
      console.error("[Auth] Initialize failed:", error);
      setLoading(false);
    }
  }, []);

  const getOrCreateUser = async (firebaseUser: any): Promise<ReemUser> => {
    const { db } = await import("@/modules/auth/firebase");
    const userRef = db.collection("users").doc(firebaseUser.uid);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      const data = userSnap.data() as any;
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? data.email ?? null,
        displayName: firebaseUser.displayName ?? data.displayName ?? null,
        role: data.role ?? "free",
        dailyTasksUsed: data.dailyTasksUsed ?? 0,
        dailyTasksLimit: data.dailyTasksLimit ?? 15,
        lastTaskDate:
          data.lastTaskDate ?? new Date().toISOString().split("T")[0],
        createdAt: data.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const newUser: ReemUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? null,
      displayName: firebaseUser.displayName ?? null,
      role: "free",
      dailyTasksUsed: 0,
      dailyTasksLimit: 15,
      lastTaskDate: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await userRef.set(newUser);
    return newUser;
  };

  const signInAnonymously = async (): Promise<ReemUser> => {
    const result = await auth.signInAnonymously();
    const userData = await getOrCreateUser(result.user);
    setUser(userData);
    return userData;
  };

  const signInWithEmail = async (
    email: string,
    password: string,
  ): Promise<ReemUser> => {
    const result = await auth.signInWithEmailAndPassword(email, password);
    const userData = await getOrCreateUser(result.user);
    setUser(userData);
    return userData;
  };

  const registerWithEmail = async (
    email: string,
    password: string,
  ): Promise<ReemUser> => {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    const userData = await getOrCreateUser(result.user);
    setUser(userData);
    return userData;
  };

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
  };

  const canPerformTask = (): boolean => {
    if (!user) return false;
    if (user.role === "pro") return true;

    const today = new Date().toISOString().split("T")[0];
    if (user.lastTaskDate !== today) {
      return true; // New day, reset
    }

    return user.dailyTasksUsed < user.dailyTasksLimit;
  };

  const incrementTaskCount = async (): Promise<boolean> => {
    if (!user) return false;

    const { db } = await import("@/modules/auth/firebase");
    const today = new Date().toISOString().split("T")[0];
    const userRef = db.collection("users").doc(user.uid);

    try {
      // Read and update inside a transaction so concurrent task starts cannot
      // overwrite each other with the same dailyTasksUsed value.
      const granted = await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) return false;

        const data = snap.data();
        if (data?.role === "pro") return true;

        const lastTaskDate = data?.lastTaskDate ?? today;
        const used = lastTaskDate !== today ? 0 : (data?.dailyTasksUsed ?? 0);
        const limit = data?.dailyTasksLimit ?? 15;
        if (used >= limit) return false;

        tx.update(userRef, {
          dailyTasksUsed: used + 1,
          lastTaskDate: today,
          updatedAt: new Date().toISOString(),
        });
        return true;
      });

      if (granted) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                dailyTasksUsed:
                  prev.lastTaskDate !== today ? 1 : prev.dailyTasksUsed + 1,
                lastTaskDate: today,
              }
            : prev,
        );
      }
      return granted;
    } catch (error) {
      console.error("[Auth] incrementTaskCount failed:", error);
      return false;
    }
  };

  const resetDailyTasks = async () => {
    if (!user) return;
    const { db } = await import("@/modules/auth/firebase");
    await db
      .collection("users")
      .doc(user.uid)
      .update({
        dailyTasksUsed: 0,
        lastTaskDate: new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString(),
      });
    setUser((prev) =>
      prev
        ? {
            ...prev,
            dailyTasksUsed: 0,
            lastTaskDate: new Date().toISOString().split("T")[0],
          }
        : prev,
    );
  };

  const upgradeToPro = async () => {
    if (!user) return;
    const { db } = await import("@/modules/auth/firebase");
    await db.collection("users").doc(user.uid).update({
      role: "pro",
      dailyTasksLimit: 999999,
      updatedAt: new Date().toISOString(),
    });
    setUser((prev) =>
      prev ? { ...prev, role: "pro", dailyTasksLimit: 999999 } : prev,
    );
    Alert.alert(
      "Reem Pro",
      "You've upgraded to Pro! Unlimited tasks unlocked.",
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initialize,
        signInAnonymously,
        signInWithEmail,
        registerWithEmail,
        signOut,
        incrementTaskCount,
        canPerformTask,
        resetDailyTasks,
        upgradeToPro,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

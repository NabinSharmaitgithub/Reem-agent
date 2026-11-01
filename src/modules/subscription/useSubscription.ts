import { useAuth } from "@/modules/auth/AuthProvider";

export const FREE_DAILY_LIMIT = 15;
export const PRO_DAILY_LIMIT = 999999;

export type SubscriptionTier = "free" | "pro";

export function useSubscription() {
  const { user, incrementTaskCount, canPerformTask, upgradeToPro, resetDailyTasks } = useAuth();

  const isPro = user?.role === "pro";
  const dailyLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const tasksRemaining = user
    ? Math.max(0, dailyLimit - user.dailyTasksUsed)
    : FREE_DAILY_LIMIT;
  const canPerform = canPerformTask();

  const recordTask = async (): Promise<boolean> => {
    if (!canPerform) return false;
    return await incrementTaskCount();
  };

  return {
    user,
    isPro,
    dailyLimit,
    tasksUsed: user?.dailyTasksUsed ?? 0,
    tasksRemaining,
    canPerformTask: canPerform,
    recordTask,
    upgradeToPro,
    resetDailyTasks,
    progress: user ? (user.dailyTasksUsed / dailyLimit) * 100 : 0,
  };
}

export function requireTaskSlot(canPerform: boolean): void {
  if (!canPerform) {
    throw new Error(
      "Daily free task limit reached (15 tasks/day). Upgrade to Pro for unlimited tasks."
    );
  }
}

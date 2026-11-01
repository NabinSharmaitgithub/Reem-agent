import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export type NotificationTriggerNativeModule = {
  isNotificationListenerEnabled(): Promise<boolean>;
  openNotificationListenerSettings(): Promise<void>;
  getLastNotification(): Promise<{
    package: string;
    postTimeMs: number;
  }>;
};

const NotificationTrigger =
  Platform.OS === "android"
    ? requireOptionalNativeModule<NotificationTriggerNativeModule>("NotificationTrigger")
    : null;

export function getNotificationTriggerModule():
  | NotificationTriggerNativeModule
  | null {
  return NotificationTrigger;
}

export const NotificationTriggerModule = NotificationTrigger;

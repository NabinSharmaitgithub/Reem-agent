import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export type DeviceAutomationNativeModule = {
  isAccessibilityEnabled(): Promise<boolean>;
  isAccessibilityServiceConnected(): Promise<boolean>;
  openAccessibilitySettings(): Promise<void>;
  requestAccessibilityPermission(): Promise<void>;
  captureHierarchy(maxDepth?: number): Promise<string>;
  getForegroundApp(): Promise<{
    package: string;
    activity: string;
    updatedAt: number;
    accessibilityEnabled: boolean;
  }>;
  performTap(x: number, y: number): Promise<void>;
  performLongPress(x: number, y: number, durationMs?: number): Promise<void>;
  performSwipe(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    durationMs?: number,
  ): Promise<void>;
  performScroll(
    x: number,
    y: number,
    direction: string,
    distance?: number,
  ): Promise<void>;
  enterText(text: string): Promise<void>;
  performGlobalAction(
    action: "back" | "home" | "recents" | "notification_shade" | "power_dialog",
  ): Promise<void>;
  takeScreenshot(): Promise<{
    path: string | null;
    captured: boolean;
    viaHierarchy?: boolean;
    error?: string;
  }>;
  isOverlayPermissionGranted(): Promise<boolean>;
  openOverlaySettings(): Promise<void>;
};

const DeviceAutomation =
  Platform.OS === "android"
    ? requireOptionalNativeModule<DeviceAutomationNativeModule>("DeviceAutomation")
    : null;

export function getDeviceAutomationModule():
  | DeviceAutomationNativeModule
  | null {
  return DeviceAutomation;
}

export const DeviceAutomationModule = DeviceAutomation;

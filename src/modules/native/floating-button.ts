import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export type FloatingButtonNativeModule = {
  isOverlayPermissionGranted(): Promise<boolean>;
  openOverlaySettings(): Promise<void>;
  showFloatingButton(): Promise<void>;
  hideFloatingButton(): Promise<void>;
  toggleFloatingButton(): Promise<void>;
  isFloatingButtonVisible(): Promise<boolean>;
};

const FloatingButton =
  Platform.OS === "android"
    ? requireOptionalNativeModule<FloatingButtonNativeModule>("FloatingButton")
    : null;

export function getFloatingButtonModule():
  | FloatingButtonNativeModule
  | null {
  return FloatingButton;
}

export const FloatingButtonModule = FloatingButton;

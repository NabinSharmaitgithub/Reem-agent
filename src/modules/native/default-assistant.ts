import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export type DefaultAssistantNativeModule = {
  isDefaultAssistantAvailable(): Promise<boolean>;
  isDefaultAssistant(): Promise<boolean>;
  requestDefaultAssistant(): Promise<boolean>;
  openDefaultAppsSettings(): Promise<void>;
};

const DefaultAssistant =
  Platform.OS === "android"
    ? requireOptionalNativeModule<DefaultAssistantNativeModule>("DefaultAssistant")
    : null;

export function getDefaultAssistantModule():
  | DefaultAssistantNativeModule
  | null {
  return DefaultAssistant;
}

export const DefaultAssistantModule = DefaultAssistant;

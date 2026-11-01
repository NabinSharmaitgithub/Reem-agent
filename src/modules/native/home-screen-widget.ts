import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export type HomeScreenWidgetNativeModule = {
  isWidgetAvailable(): Promise<boolean>;
  getWidgetIds(): Promise<number[]>;
  openWidgetSettings(): Promise<void>;
};

const HomeScreenWidget =
  Platform.OS === "android"
    ? requireOptionalNativeModule<HomeScreenWidgetNativeModule>("HomeScreenWidget")
    : null;

export function getHomeScreenWidgetModule():
  | HomeScreenWidgetNativeModule
  | null {
  return HomeScreenWidget;
}

export const HomeScreenWidgetModule = HomeScreenWidget;

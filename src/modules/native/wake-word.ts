import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export type WakeWordNativeModule = {
  isWakeWordAvailable(): Promise<boolean>;
  isWakeWordEnabled(): Promise<boolean>;
  enableWakeWord(enabled: boolean): Promise<void>;
  setDetectionMode(mode: "stt" | "porcupine"): Promise<void>;
  setWakeWordPhrase(phrase: string): Promise<void>;
  setSensitivity(value: number): Promise<void>;
  setPorcupineAccessKey(key: string | null): Promise<void>;
  getPorcupineAccessKey(): Promise<string>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  isListening(): Promise<boolean>;
};

const WakeWord =
  Platform.OS === "android"
    ? requireOptionalNativeModule<WakeWordNativeModule>("WakeWord")
    : null;

export function getWakeWordModule(): WakeWordNativeModule | null {
  return WakeWord;
}

export const WakeWordModule = WakeWord;

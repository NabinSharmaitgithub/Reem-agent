import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { WakeWordModule } from "@/modules/native/wake-word";

export type WakeWordState = {
  available: boolean;
  enabled: boolean;
  listening: boolean;
  mode: "stt" | "porcupine";
  phrase: string;
  sensitivity: number;
  accessKey: string | null;
};

export function useWakeWord() {
  const [state, setState] = useState<WakeWordState>({
    available: false,
    enabled: false,
    listening: false,
    mode: "stt",
    phrase: "reem",
    sensitivity: 0.5,
    accessKey: null,
  });

  const onWakeWordRef = useRef<(() => void) | null>(null);

  const initialize = async () => {
    if (!WakeWordModule || Platform.OS !== "android") return;

    try {
      const [available, enabled, listening] = await Promise.all([
        WakeWordModule.isWakeWordAvailable(),
        WakeWordModule.isWakeWordEnabled(),
        WakeWordModule.isListening(),
      ]);
      const mode = (await WakeWordModule.getPorcupineAccessKey())
        ? "porcupine"
        : "stt";

      setState((prev) => ({
        ...prev,
        available,
        enabled,
        listening,
        mode,
      }));
    } catch (error) {
      console.error("[WakeWord] Initialize failed:", error);
    }
  };

  const setEnabled = async (enabled: boolean) => {
    if (!WakeWordModule) return;
    try {
      await WakeWordModule.enableWakeWord(enabled);
      setState((prev) => ({ ...prev, enabled, listening: enabled }));
    } catch (error) {
      console.error("[WakeWord] setEnabled failed:", error);
    }
  };

  const setMode = async (mode: "stt" | "porcupine") => {
    if (!WakeWordModule) return;
    try {
      await WakeWordModule.setDetectionMode(mode);
      setState((prev) => ({ ...prev, mode }));
    } catch (error) {
      console.error("[WakeWord] setMode failed:", error);
    }
  };

  const setPhrase = async (phrase: string) => {
    if (!WakeWordModule) return;
    try {
      await WakeWordModule.setWakeWordPhrase(phrase);
      setState((prev) => ({ ...prev, phrase }));
    } catch (error) {
      console.error("[WakeWord] setPhrase failed:", error);
    }
  };

  const setSensitivity = async (value: number) => {
    if (!WakeWordModule) return;
    try {
      await WakeWordModule.setSensitivity(value);
      setState((prev) => ({ ...prev, sensitivity: value }));
    } catch (error) {
      console.error("[WakeWord] setSensitivity failed:", error);
    }
  };

  const setAccessKey = async (key: string | null) => {
    if (!WakeWordModule) return;
    try {
      await WakeWordModule.setPorcupineAccessKey(key);
      setState((prev) => ({ ...prev, accessKey: key, mode: key ? "porcupine" : "stt" }));
    } catch (error) {
      console.error("[WakeWord] setAccessKey failed:", error);
    }
  };

  const registerOnWakeWord = (callback: () => void) => {
    onWakeWordRef.current = callback;
  };

  useEffect(() => {
    if (!WakeWordModule || Platform.OS !== "android") return;

    initialize();

    return () => undefined;
  }, []);

  return {
    ...state,
    initialize,
    setEnabled,
    setMode,
    setPhrase,
    setSensitivity,
    setAccessKey,
    registerOnWakeWord,
  };
}

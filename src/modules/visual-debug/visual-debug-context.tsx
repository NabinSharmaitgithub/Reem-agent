/**
 * VisualDebugContext
 *
 * Context provider for the visual debugging system. Manages:
 * - Whether visual debugging is enabled
 * - Tap indicators (ripple dots where user taps)
 * - Bounding box overlays around UI elements
 * - Screen flash on significant actions
 * - TTS audio wave visualizer level
 * - Debug mode toggle
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

type TapPoint = {
  id: string;
  x: number;
  y: number;
  timestamp: number;
};

type BoundingBox = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
};

type VisualDebugState = {
  enabled: boolean;
  showTapIndicators: boolean;
  showBoundingBoxes: boolean;
  enableScreenFlash: boolean;
  enableTtsWaveform: boolean;
  points: TapPoint[];
  boxes: BoundingBox[];
  isFlashing: boolean;
  ttsLevel: number;
};

type VisualDebugContextType = {
  state: VisualDebugState;
  addTap: (x: number, y: number) => void;
  addBox: (box: Omit<BoundingBox, "id">) => void;
  removeBox: (id: string) => void;
  clearBoxes: () => void;
  triggerFlash: () => void;
  setTtsLevel: (level: number) => void;
  setEnabled: (enabled: boolean) => void;
  setShowTapIndicators: (enabled: boolean) => void;
  setShowBoundingBoxes: (enabled: boolean) => void;
  setEnableScreenFlash: (enabled: boolean) => void;
  setEnableTtsWaveform: (enabled: boolean) => void;
};

const VisualDebugContext = createContext<VisualDebugContextType | undefined>(
  undefined,
);

export function VisualDebugProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<VisualDebugState>({
    enabled: Platform.OS === "android" ? false : false,
    showTapIndicators: true,
    showBoundingBoxes: true,
    enableScreenFlash: true,
    enableTtsWaveform: true,
    points: [],
    boxes: [],
    isFlashing: false,
    ttsLevel: 0,
  });

  const tapCounter = useRef(0);
  const boxCounter = useRef(0);

  const addTap = useCallback(
    (x: number, y: number) => {
      if (!state.enabled || !state.showTapIndicators) return;
      tapCounter.current += 1;
      const point: TapPoint = {
        id: `tap-${tapCounter.current}-${Date.now()}`,
        x,
        y,
        timestamp: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        points: [...prev.points, point].slice(-20), // Keep last 20 taps
      }));
      // Auto-remove tap after animation
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          points: prev.points.filter((p) => p.id !== point.id),
        }));
      }, 800);
    },
    [state.enabled, state.showTapIndicators],
  );

  const addBox = useCallback(
    (box: Omit<BoundingBox, "id">) => {
      if (!state.enabled || !state.showBoundingBoxes) return;
      boxCounter.current += 1;
      const newBox: BoundingBox = { ...box, id: `box-${boxCounter.current}` };
      setState((prev) => ({
        ...prev,
        boxes: [...prev.boxes, newBox],
      }));
      // Auto-remove box after 3 seconds
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          boxes: prev.boxes.filter((b) => b.id !== newBox.id),
        }));
      }, 3000);
    },
    [state.enabled, state.showBoundingBoxes],
  );

  const removeBox = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      boxes: prev.boxes.filter((b) => b.id !== id),
    }));
  }, []);

  const clearBoxes = useCallback(() => {
    setState((prev) => ({ ...prev, boxes: [] }));
  }, []);

  const triggerFlash = useCallback(() => {
    if (!state.enabled || !state.enableScreenFlash) return;
    setState((prev) => ({ ...prev, isFlashing: true }));
    setTimeout(() => {
      setState((prev) => ({ ...prev, isFlashing: false }));
    }, 300);
  }, [state.enabled, state.enableScreenFlash]);

  const setTtsLevel = useCallback(
    (level: number) => {
      if (!state.enabled || !state.enableTtsWaveform) return;
      setState((prev) => ({ ...prev, ttsLevel: level }));
    },
    [state.enabled, state.enableTtsWaveform],
  );

  const setEnabled = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, enabled }));
  }, []);

  const setShowTapIndicators = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, showTapIndicators: enabled }));
  }, []);

  const setShowBoundingBoxes = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, showBoundingBoxes: enabled }));
  }, []);

  const setEnableScreenFlash = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, enableScreenFlash: enabled }));
  }, []);

  const setEnableTtsWaveform = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, enableTtsWaveform: enabled }));
  }, []);

  // Simulate TTS waveform when TTS is speaking
  useEffect(() => {
    if (!state.enabled || !state.enableTtsWaveform) return;

    // Simulate speech wave animation
    const interval = setInterval(() => {
      if (state.enabled && state.enableTtsWaveform) {
        setState((prev) => ({
          ...prev,
          ttsLevel: Math.random() * 0.8 + 0.2,
        }));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [state.enabled, state.enableTtsWaveform]);

  return (
    <VisualDebugContext.Provider
      value={{
        state,
        addTap,
        addBox,
        removeBox,
        clearBoxes,
        triggerFlash,
        setTtsLevel,
        setEnabled,
        setShowTapIndicators,
        setShowBoundingBoxes,
        setEnableScreenFlash,
        setEnableTtsWaveform,
      }}
    >
      {children}
    </VisualDebugContext.Provider>
  );
}

export function useVisualDebug() {
  const context = useContext(VisualDebugContext);
  if (!context) {
    throw new Error("useVisualDebug must be used within a VisualDebugProvider");
  }
  return context;
}

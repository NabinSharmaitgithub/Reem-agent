import { useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

/**
 * VisualDebugOverlay renders debug indicators on top of the screen:
 * - Tap indicators (ripple effect where the user taps)
 * - Bounding box overlays around detected UI elements
 * - Screen flash on significant actions
 * - TTS audio wave visualizer
 *
 * Usage:
 *   const [debugPoints, setDebugPoints] = useState([]);
 *   <VisualDebugOverlay points={debugPoints} boxes={boxes} isFlashing={isFlashing} ttsLevel={ttsLevel} />
 */
export function VisualDebugOverlay({
  points = [],
  boxes = [],
  isFlashing = false,
  ttsLevel = 0,
}: {
  points?: { x: number; y: number; id: string }[];
  boxes?: {
    x: number;
    y: number;
    w: number;
    h: number;
    label?: string;
    id: string;
  }[];
  isFlashing?: boolean;
  ttsLevel?: number;
}) {
  const flashAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  // Flash animation
  if (isFlashing) {
    Animated.timing(flashAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 300,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }

  return (
    <View
      style={[
        styles.container,
        isFlashing && { backgroundColor: "rgba(255, 255, 255, 0.2)" },
      ]}
      pointerEvents="none"
    >
      {/* Screen flash overlay */}
      <Animated.View style={[styles.flash, { opacity: flashAnim }]} />

      {/* Tap indicators */}
      {points.map((point) => (
        <View key={point.id} style={styles.tapContainer}>
          <Animated.View
            style={[
              styles.tapRipple,
              {
                transform: [{ scale: flashAnim }],
                left: point.x - 20,
                top: point.y - 20,
              },
            ]}
          />
          <View
            style={[styles.tapDot, { left: point.x - 4, top: point.y - 4 }]}
          />
        </View>
      ))}

      {/* Bounding box overlays */}
      {boxes.map((box) => (
        <View key={box.id} style={styles.boxContainer}>
          <View
            style={[
              styles.boundingBox,
              {
                left: box.x,
                top: box.y,
                width: box.w,
                height: box.h,
              },
            ]}
          />
          {box.label && (
            <View style={[styles.boxLabel, { left: box.x, top: box.y - 20 }]}>
              <Text style={styles.boxLabelText}>{box.label}</Text>
            </View>
          )}
        </View>
      ))}

      {/* TTS audio wave visualizer */}
      <View style={styles.ttsContainer}>
        <Text style={styles.ttsLabel}>TTS</Text>
        <View style={styles.ttsWave}>
          {[1, 2, 3, 4, 5, 6, 7].map((i, idx) => (
            <Animated.View
              key={idx}
              style={[
                styles.ttsBar,
                {
                  transform: [
                    {
                      scaleY: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.2, 1 + ttsLevel],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    pointerEvents: "none",
    zIndex: 9999,
  },
  flash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  tapContainer: {
    position: "absolute",
    zIndex: 10000,
  },
  tapRipple: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 122, 255, 0.3)",
  },
  tapDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007AFF",
  },
  boxContainer: {
    position: "absolute",
    zIndex: 10000,
  },
  boundingBox: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  boxLabel: {
    position: "absolute",
    backgroundColor: "#007AFF",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  boxLabelText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  ttsContainer: {
    position: "absolute",
    bottom: 60,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10000,
  },
  ttsLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  ttsWave: {
    flexDirection: "row",
    gap: 3,
    height: 20,
    alignItems: "flex-end",
  },
  ttsBar: {
    width: 4,
    backgroundColor: "#007AFF",
    borderRadius: 2,
  },
});

export const visualDebugStyles = styles;

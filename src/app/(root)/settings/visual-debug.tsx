/**
 * VisualDebugSettings
 *
 * Settings screen for the visual debugging system. Allows toggling:
 * - Visual debugging on/off
 * - Tap indicators
 * - Bounding boxes
 * - Screen flash
 * - TTS waveform visualization
 */

import { Zap } from "lucide-react-native";
import { Platform, ScrollView, Switch, Text, View } from "react-native";

import { Container } from "@/components/shared/container";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useVisualDebug } from "@/modules/visual-debug/visual-debug-context";

export default function VisualDebugSettingsScreen() {
  const {
    state,
    setEnabled,
    setShowTapIndicators,
    setShowBoundingBoxes,
    setEnableScreenFlash,
    setEnableTtsWaveform,
  } = useVisualDebug();

  const supported = Platform.OS === "android";

  if (!supported) {
    return (
      <Container>
        <Card className="p-sp-6">
          <Text className="text-foreground">
            Visual debugging is only available on Android.
          </Text>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View className="px-sp-4 pb-sp-8">
          <View className="mb-sp-6">
            <View className="flex-row items-center gap-sp-2 mb-sp-4">
              <Zap className="w-sp-8 h-sp-8 text-primary" />
              <Text className="font-bold text-foreground text-2xl">
                Visual Debugging
              </Text>
            </View>
            <Text className="text-muted-foreground text-sm">
              Visual debugging overlays for development and testing. Shows tap
              indicators, bounding boxes, screen flash, and TTS waveform.
            </Text>
          </View>

          <Card className="overflow-hidden mb-sp-4">
            <View className="flex-row items-center justify-between px-sp-4 py-sp-3">
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  Visual Debugging
                </Text>
                <Text className="text-xs text-muted-foreground mt-sp-0.5">
                  Enable visual debug overlays on screen
                </Text>
              </View>
              <Switch value={state.enabled} onValueChange={setEnabled} />
            </View>
            <Separator />

            <View className="flex-row items-center justify-between px-sp-4 py-sp-3">
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  Tap Indicators
                </Text>
                <Text className="text-xs text-muted-foreground mt-sp-0.5">
                  Show ripple effects where you tap
                </Text>
              </View>
              <Switch
                value={state.showTapIndicators}
                onValueChange={setShowTapIndicators}
                disabled={!state.enabled}
              />
            </View>

            <View className="flex-row items-center justify-between px-sp-4 py-sp-3 border-t border-border dark:border-border-dark">
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  Bounding Boxes
                </Text>
                <Text className="text-xs text-muted-foreground mt-sp-0.5">
                  Show UI element bounds
                </Text>
              </View>
              <Switch
                value={state.showBoundingBoxes}
                onValueChange={setShowBoundingBoxes}
                disabled={!state.enabled}
              />
            </View>

            <View className="flex-row items-center justify-between px-sp-4 py-sp-3 border-t border-border dark:border-border-dark">
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  Screen Flash
                </Text>
                <Text className="text-xs text-muted-foreground mt-sp-0.5">
                  Flash screen on significant actions
                </Text>
              </View>
              <Switch
                value={state.enableScreenFlash}
                onValueChange={setEnableScreenFlash}
                disabled={!state.enabled}
              />
            </View>

            <View className="flex-row items-center justify-between px-sp-4 py-sp-3 border-t border-border dark:border-border-dark">
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  TTS Waveform
                </Text>
                <Text className="text-xs text-muted-foreground mt-sp-0.5">
                  Visualize speech audio levels
                </Text>
              </View>
              <Switch
                value={state.enableTtsWaveform}
                onValueChange={setEnableTtsWaveform}
                disabled={!state.enabled}
              />
            </View>
          </Card>

          <Card>
            <View className="p-sp-4">
              <Text className="font-semibold text-foreground mb-sp-3">
                How to use
              </Text>
              <View className="space-y-sp-3">
                <View className="flex-row items-start gap-sp-3">
                  <Zap className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-1" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Enable Visual Debugging to see overlays on screen.
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-sp-3">
                  <Zap className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-1" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Tap anywhere to see ripple indicators.
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-sp-3">
                  <Zap className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-1" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Screen flashes on significant actions like tool calls.
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-sp-3">
                  <Zap className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-1" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      TTS waveform animates while Reem speaks.
                    </Text>
                  </View>
                </View>
              </View>
              <Separator className="my-sp-4" />
              <Text className="text-sm text-muted-foreground">
                Visual debugging is intended for development and testing. All
                overlays are drawn on top of the app and do not interfere with
                normal operation.
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </Container>
  );
}

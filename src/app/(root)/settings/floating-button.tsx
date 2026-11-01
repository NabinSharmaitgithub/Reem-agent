import { ChevronRight, Smartphone } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/hooks/use-theme";

import { GlassInputOverlay } from "@/components/overlay/GlassInputOverlay";
import { FloatingButtonModule } from "@/modules/native/floating-button";

export default function FloatingButtonSettingsScreen() {
  const theme = useTheme();
  const supported = Platform.OS === "android";
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [glassInputEnabled, setGlassInputEnabled] = useState(false);
  const [glassInputVisible, setGlassInputVisible] = useState(false);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    if (!supported || !FloatingButtonModule) {
      setChecking(false);
      return;
    }
    try {
      const [overlay, isVisible] = await Promise.all([
        FloatingButtonModule.isOverlayPermissionGranted(),
        FloatingButtonModule.isFloatingButtonVisible(),
      ]);
      setOverlayGranted(overlay);
      setVisible(isVisible);
    } catch (error) {
      console.error("[FloatingButtonSettings] status check failed:", error);
    } finally {
      setChecking(false);
    }
  }, [supported]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!supported) {
    return (
      <Container>
        <Card className="p-sp-6">
          <Text className="text-foreground">
            Floating button is only available on Android.
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
            <Text className="font-bold text-foreground text-lg mb-sp-2">
              Floating Button
            </Text>
            <Text className="text-muted-foreground text-sm">
              A draggable on-screen bubble for quick access to Reem from any
              app. Requires &quot;Display over other apps&quot; permission.
            </Text>
          </View>

          <Card className="mb-sp-4 overflow-hidden">
            <View className="flex-row items-start gap-sp-4 p-sp-4 bg-background dark:bg-background-dark">
              <Smartphone className="w-sp-6 h-sp-6 text-primary shrink-0 mt-sp-0.5" />
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  Overlay Permission
                </Text>
                <Text className="text-sm text-muted-foreground mt-sp-1">
                  Required to show the floating button on top of other apps.
                </Text>
              </View>
            </View>
            <Separator />
            <View className="flex-row items-center justify-between px-sp-4 py-sp-3">
              <Text className="text-sm text-foreground">
                Display over other apps
              </Text>
              <Pressable
                className="w-sp-10 h-sp-5 rounded-full px-sp-2"
                style={{
                  backgroundColor: overlayGranted
                    ? theme.backgroundElement
                    : "rgba(0,0,0,0.12)",
                }}
              >
                {overlayGranted && (
                  <ChevronRight className="w-sp-4 h-sp-4 fill-white" />
                )}
              </Pressable>
            </View>
            <View className="px-sp-4 py-sp-3">
              <Button
                variant="outline"
                onPress={async () => {
                  try {
                    await FloatingButtonModule?.openOverlaySettings();
                    setTimeout(refresh, 1500);
                  } catch (error) {
                    Alert.alert(
                      "Overlay",
                      error instanceof Error ? error.message : String(error),
                    );
                  }
                }}
                disabled={overlayGranted}
                className="w-full"
              >
                {overlayGranted
                  ? "Already granted"
                  : "Grant Overlay Permission"}
              </Button>
            </View>
          </Card>

          <Card className="mb-sp-4 overflow-hidden">
            <View className="flex-row items-center justify-between px-sp-4 py-sp-3 border-b border-border dark:border-border-dark">
              <View className="flex-1">
                <Text className="text-sm text-foreground">
                  Show floating button
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Draggable bubble that opens Reem
                </Text>
              </View>
              <Pressable
                className="w-sp-10 h-sp-5 rounded-full px-sp-2"
                style={{
                  backgroundColor: visible
                    ? theme.backgroundElement
                    : "rgba(0,0,0,0.12)",
                }}
                onPress={async () => {
                  try {
                    if (!FloatingButtonModule) throw new Error("Floating button is unavailable on this device.");
                    await FloatingButtonModule.toggleFloatingButton();
                    setVisible(!visible);
                  } catch (error) {
                    Alert.alert(
                      "Floating Button",
                      error instanceof Error ? error.message : String(error),
                    );
                  }
                }}
              >
                {visible && (
                  <ChevronRight className="w-sp-4 h-sp-4 fill-white" />
                )}
              </Pressable>
            </View>
            <View className="px-sp-4 py-sp-3">
              <Button
                disabled={!overlayGranted || checking}
                onPress={async () => {
                  try {
                    if (!FloatingButtonModule) throw new Error("Floating button is unavailable on this device.");
                    await FloatingButtonModule.showFloatingButton();
                    setVisible(true);
                  } catch (error) {
                    Alert.alert(
                      "Floating Button",
                      error instanceof Error ? error.message : String(error),
                    );
                  }
                }}
                className="w-full"
              >
                Show Button
              </Button>
              {!overlayGranted && (
                <Text className="text-xs text-muted-foreground mt-sp-2 text-center">
                  Grant overlay permission first to show the button.
                </Text>
              )}
            </View>
          </Card>

          <Card>
            <View className="p-sp-4">
              <View className="flex-row items-center justify-between px-sp-4 py-sp-3 border-b border-border dark:border-border-dark">
                <View className="flex-1">
                  <Text className="text-sm text-foreground">
                    Glass input overlay
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Show glass-style input when tapping floating button
                  </Text>
                </View>
                <Pressable
                  className="w-sp-10 h-sp-5 rounded-full px-sp-2"
                  style={{
                    backgroundColor: glassInputEnabled
                      ? theme.backgroundElement
                      : "rgba(0,0,0,0.12)",
                  }}
                  onPress={() => setGlassInputEnabled(!glassInputEnabled)}
                >
                  {glassInputEnabled && (
                    <ChevronRight className="w-sp-4 h-sp-4 fill-white" />
                  )}
                </Pressable>
              </View>
              <View className="px-sp-4 py-sp-3">
                <Button
                  disabled={!glassInputEnabled}
                  onPress={() => setGlassInputVisible(true)}
                  className="w-full"
                >
                  Preview Glass Input
                </Button>
                {!glassInputEnabled && (
                  <Text className="text-xs text-muted-foreground mt-sp-2 text-center">
                    Enable glass input overlay to use this feature.
                  </Text>
                )}
              </View>
            </View>
          </Card>
        </View>

        {glassInputVisible && (
          <GlassInputOverlay
            visible={glassInputVisible}
            onClose={() => setGlassInputVisible(false)}
            onSubmit={(text) => {
              setGlassInputVisible(false);
              console.log("Glass input submitted:", text);
            }}
          />
        )}
      </ScrollView>
    </Container>
  );
}

import { Check, HandGrab, ShieldAlert, Smartphone } from "lucide-react-native";
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
import { DeviceAutomationModule } from "@/modules/native/device-automation";
import { FloatingButtonModule } from "@/modules/native/floating-button";

export default function AccessibilitySettingsScreen() {
  const theme = useTheme();
  const supported = Platform.OS === "android";
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [serviceConnected, setServiceConnected] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    if (!supported || !DeviceAutomationModule) {
      setChecking(false);
      return;
    }
    try {
      const [enabled, connected, overlay] = await Promise.all([
        DeviceAutomationModule.isAccessibilityEnabled(),
        DeviceAutomationModule.isAccessibilityServiceConnected(),
        FloatingButtonModule?.isOverlayPermissionGranted() ??
          Promise.resolve(false),
      ]);
      setAccessibilityEnabled(enabled);
      setServiceConnected(connected);
      setOverlayGranted(overlay);
    } catch (error) {
      console.error("[AccessibilitySettings] status check failed:", error);
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
            Device automation is only available on Android.
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
              Accessibility & Device Control
            </Text>
            <Text className="text-muted-foreground text-sm">
              Reem can read your screen and perform taps, swipes, and text entry
              across apps so you can automate tasks by voice. All processing
              happens locally on your device.
            </Text>
          </View>

          <Card className="mb-sp-4 overflow-hidden">
            <View className="flex-row items-start gap-sp-4 p-sp-4 bg-background dark:bg-background-dark">
              <ShieldAlert className="w-sp-6 h-sp-6 text-destructive shrink-0 mt-sp-0.5" />
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  Accessibility Service
                </Text>
                <Text className="text-sm text-muted-foreground mt-sp-1">
                  Required to read the screen and perform gestures in other
                  apps.
                </Text>
              </View>
            </View>
            <Separator />
            <View className="flex-row items-center justify-between px-sp-4 py-sp-3">
              <Text className="text-sm text-foreground">
                Enabled in system settings
              </Text>
              <Pressable
                className="w-sp-10 h-sp-5 rounded-full px-sp-2"
                style={{
                  backgroundColor: accessibilityEnabled
                    ? theme.backgroundElement
                    : "rgba(0,0,0,0.12)",
                }}
              >
                {accessibilityEnabled && (
                  <Check className="w-sp-4 h-sp-4 fill-white" />
                )}
              </Pressable>
            </View>
            {accessibilityEnabled ? (
              <View className="flex-row items-center justify-between px-sp-4 py-sp-3 border-t border-border dark:border-border-dark">
                <Text className="text-sm text-foreground">
                  Service connected
                </Text>
                <Pressable
                  className="w-sp-10 h-sp-5 rounded-full px-sp-2"
                  style={{
                    backgroundColor: serviceConnected
                      ? theme.backgroundElement
                      : "rgba(0,0,0,0.12)",
                  }}
                >
                  {serviceConnected && (
                    <Check className="w-sp-4 h-sp-4 fill-white" />
                  )}
                </Pressable>
              </View>
            ) : null}
            <View className="px-sp-4 py-sp-3">
              <Button
                onPress={async () => {
                  try {
                    await DeviceAutomationModule?.requestAccessibilityPermission();
                    setTimeout(refresh, 2000);
                  } catch (error) {
                    Alert.alert(
                      "Accessibility",
                      error instanceof Error ? error.message : String(error),
                    );
                  }
                }}
                disabled={accessibilityEnabled}
                className="w-full"
              >
                {accessibilityEnabled
                  ? "Already enabled — reopen settings"
                  : "Enable Accessibility Service"}
              </Button>
              {accessibilityEnabled && (
                <Text className="text-xs text-muted-foreground mt-sp-2 text-center">
                  Go to Settings → Accessibility → Reem and toggle it on, then
                  return here.
                </Text>
              )}
            </View>
          </Card>

          <Card className="mb-sp-4 overflow-hidden">
            <View className="flex-row items-start gap-sp-4 p-sp-4 bg-background dark:bg-background-dark">
              <Smartphone className="w-sp-6 h-sp-6 text-primary shrink-0 mt-sp-0.5" />
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  Display Over Other Apps
                </Text>
                <Text className="text-sm text-muted-foreground mt-sp-1">
                  Required for the floating button and on-screen overlays.
                </Text>
              </View>
            </View>
            <Separator />
            <View className="flex-row items-center justify-between px-sp-4 py-sp-3">
              <Text className="text-sm text-foreground">
                Overlay permission granted
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
                  <Check className="w-sp-4 h-sp-4 fill-white" />
                )}
              </Pressable>
            </View>
            <View className="px-sp-4 py-sp-3">
              <Button
                variant="outline"
                onPress={async () => {
                  try {
                    await FloatingButtonModule?.openOverlaySettings();
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
                  : "Grant Display Over Other Apps"}
              </Button>
            </View>
          </Card>

          <Card>
            <View className="p-sp-4">
              <Text className="font-semibold text-foreground mb-sp-3">
                What Reem can do with accessibility
              </Text>
              <View className="space-y-sp-3">
                <View className="flex-row items-start gap-sp-3">
                  <HandGrab className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-1" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Read screen elements (buttons, text fields, labels)
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-sp-3">
                  <HandGrab className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-1" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Tap, long-press, swipe, and scroll in any app
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-sp-3">
                  <HandGrab className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-1" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Type into focused input fields
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-sp-3">
                  <HandGrab className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-1" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Back / Home / Recents navigation
                    </Text>
                  </View>
                </View>
              </View>
              <Separator className="my-sp-4" />
              <Text className="text-sm text-muted-foreground">
                Privacy: All screen reading happens locally. Reem does not
                upload screenshots or UI data to any server.
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </Container>
  );
}

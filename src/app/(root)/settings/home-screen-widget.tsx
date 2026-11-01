import { PanelsTopLeft, Smartphone } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { HomeScreenWidgetModule } from "@/modules/native/home-screen-widget";

export default function HomeScreenWidgetSettingsScreen() {
  const supported = Platform.OS === "android";

  const [isAvailable, setIsAvailable] = useState(false);
  const [widgetCount, setWidgetCount] = useState(0);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    if (!supported || !HomeScreenWidgetModule) {
      setChecking(false);
      return;
    }
    try {
      const [available, ids] = await Promise.all([
        HomeScreenWidgetModule.isWidgetAvailable(),
        HomeScreenWidgetModule.getWidgetIds(),
      ]);
      setIsAvailable(available);
      setWidgetCount(ids.length);
    } catch (error) {
      console.error("[WidgetSettings] Status check failed:", error);
    } finally {
      setChecking(false);
    }
  }, [supported]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openWidgetPicker = async () => {
    if (!HomeScreenWidgetModule) return;
    try {
      await HomeScreenWidgetModule.openWidgetSettings();
      setTimeout(refresh, 2000);
    } catch (error: any) {
      Alert.alert("Widget", error?.message ?? "Failed to open widget picker.");
    }
  };

  if (!supported) {
    return (
      <Container>
        <Card className="p-sp-6">
          <Text className="text-foreground">
            Home screen widget is only available on Android.
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
              <PanelsTopLeft className="w-sp-8 h-sp-8 text-primary" />
              <Text className="font-bold text-foreground text-2xl">
                Home Screen Widget
              </Text>
            </View>
            <Text className="text-muted-foreground text-sm">
              Add a Reem widget to your home screen for quick access. Tap the
              widget to open Reem, or tap the microphone icon to start voice
              input immediately.
            </Text>
          </View>

          {!isAvailable && (
            <Card className="mb-sp-4 overflow-hidden">
              <View className="px-sp-4 py-sp-4">
                <Text className="text-sm text-destructive">
                  Home screen widgets are not available on this device.
                </Text>
              </View>
            </Card>
          )}

          <Card className="mb-sp-4 overflow-hidden">
            <View className="flex-row items-center justify-between px-sp-4 py-sp-3">
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  Widgets installed
                </Text>
                <Text className="text-xs text-muted-foreground mt-sp-0.5">
                  Active Reem widgets on your home screen
                </Text>
              </View>
              <Text className="text-sm font-medium text-foreground">
                {widgetCount}
              </Text>
            </View>
            <Separator />
            <View className="px-sp-4 py-sp-3">
              <Button
                onPress={openWidgetPicker}
                disabled={checking || !isAvailable}
                className="w-full"
                loading={checking}
              >
                {widgetCount > 0
                  ? "Add another widget"
                  : "Add widget to home screen"}
              </Button>
            </View>
          </Card>

          <Card>
            <View className="p-sp-4">
              <Text className="font-semibold text-foreground mb-sp-3">
                How to use
              </Text>
              <View className="space-y-sp-3">
                <View className="flex-row items-start gap-sp-3">
                  <Smartphone className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-1" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Long-press on your home screen, tap &quot;Widgets&quot;,
                      and find Reem in the widget list.
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-sp-3">
                  <Smartphone className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-1" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Drag the Reem widget onto your home screen.
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-sp-3">
                  <Smartphone className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-1" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Tap the widget to open Reem, or the mic icon to start
                      voice input immediately.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </Container>
  );
}

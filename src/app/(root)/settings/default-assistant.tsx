import { Bot, Crown, ShieldCheck } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Alert, Platform, ScrollView, Switch, Text, View } from "react-native";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { DefaultAssistantModule } from "@/modules/native/default-assistant";

export default function DefaultAssistantSettingsScreen() {
  const supported = Platform.OS === "android";

  const [isAvailable, setIsAvailable] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    if (!supported || !DefaultAssistantModule) {
      setChecking(false);
      return;
    }
    try {
      const [available, defaultAssistant] = await Promise.all([
        DefaultAssistantModule.isDefaultAssistantAvailable(),
        DefaultAssistantModule.isDefaultAssistant(),
      ]);
      setIsAvailable(available);
      setIsDefault(defaultAssistant);
    } catch (error) {
      console.error("[DefaultAssistant] Status check failed:", error);
    } finally {
      setChecking(false);
    }
  }, [supported]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestDefaultAssistant = async () => {
    if (!DefaultAssistantModule) return;
    try {
      const becameDefault =
        await DefaultAssistantModule.requestDefaultAssistant();
      setIsDefault(becameDefault);
      if (!becameDefault) {
        Alert.alert(
          "Default Assistant",
          "Reem was not set as the default assistant. You can change this anytime in Settings → Apps → Default apps → Digital assistant app.",
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Default Assistant",
        error?.message ?? "Failed to request default assistant role.",
      );
    }
  };

  if (!supported) {
    return (
      <Container>
        <Card className="p-sp-6">
          <Text className="text-foreground">
            Default assistant is only available on Android.
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
              <Bot className="w-sp-8 h-sp-8 text-primary" />
              <Text className="font-bold text-foreground text-2xl">
                Default AI Assistant
              </Text>
            </View>
            <Text className="text-muted-foreground text-sm">
              Set Reem as your device&apos;s default assistant so you can invoke
              it with the assistant gesture or long-press home button.
            </Text>
          </View>

          {!isAvailable && (
            <Card className="mb-sp-4 overflow-hidden">
              <View className="px-sp-4 py-sp-4">
                <Text className="text-sm text-destructive">
                  Default assistant is not available on this device (requires
                  Android 10 or higher).
                </Text>
              </View>
            </Card>
          )}

          <Card className="mb-sp-4 overflow-hidden">
            <View className="flex-row items-center justify-between px-sp-4 py-sp-3">
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  Reem as default assistant
                </Text>
                <Text className="text-xs text-muted-foreground mt-sp-0.5">
                  Invoke Reem from anywhere using the assistant gesture
                </Text>
              </View>
              <Switch
                value={isDefault}
                onValueChange={requestDefaultAssistant}
                disabled={!isAvailable || checking}
              />
            </View>
            <Separator />

            <View className="px-sp-4 py-sp-3">
              <Button
                onPress={requestDefaultAssistant}
                disabled={checking || isDefault}
                className="w-full"
              >
                {isDefault
                  ? "Already set as default"
                  : "Set Reem as default assistant"}
              </Button>
              {!isDefault && isAvailable && (
                <Text className="text-xs text-muted-foreground mt-sp-2 text-center">
                  This will open a system dialog asking you to choose Reem as
                  your default assistant app.
                </Text>
              )}
            </View>

            <View className="px-sp-4 py-sp-3 border-t border-border dark:border-border-dark">
              <Button
                variant="outline"
                onPress={async () => {
                  try {
                    await DefaultAssistantModule?.openDefaultAppsSettings();
                  } catch (error) {
                    Alert.alert(
                      "Settings",
                      error instanceof Error ? error.message : String(error),
                    );
                  }
                }}
                disabled={!isAvailable || checking}
                className="w-full"
              >
                Open Default Apps Settings
              </Button>
              <Text className="text-xs text-muted-foreground mt-sp-2 text-center">
                Manage all default apps, including the digital assistant.
              </Text>
            </View>
          </Card>

          <Card>
            <View className="p-sp-4">
              <Text className="font-semibold text-foreground mb-sp-3">
                How it works
              </Text>
              <View className="space-y-sp-3">
                <View className="flex-row items-start gap-sp-3">
                  <ShieldCheck className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-1" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Once set, long-press the home button or use the assistant
                      gesture to wake Reem from any screen.
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-sp-3">
                  <Bot className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-1" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Reem&apos;s voice input will start automatically when
                      invoked.
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-sp-3">
                  <Crown className="w-sp-5 h-sp-5 text-primary shrink-0 mt-sp-1" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Works alongside wake-word detection for hands-free access.
                    </Text>
                  </View>
                </View>
              </View>
              <Separator className="my-sp-4" />
              <Text className="text-sm text-muted-foreground">
                Android requires explicit user consent to set a default
                assistant — Reem cannot set itself automatically.
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </Container>
  );
}

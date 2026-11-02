import { useRouter } from "expo-router";
import { Check, Crown, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/modules/auth/AuthProvider";
import {
  FREE_DAILY_LIMIT,
  useSubscription,
} from "@/modules/subscription/useSubscription";

export default function ProScreen() {
  const router = useRouter();
  const { upgradeToPro } = useAuth();
  const { isPro } = useSubscription();
  const [busy, setBusy] = useState(false);

  const handleUpgrade = async () => {
    setBusy(true);
    try {
      await upgradeToPro();
    } catch (error: any) {
      Alert.alert("Upgrade failed", error?.message ?? String(error));
    } finally {
      setBusy(false);
    }
  };

  if (isPro) {
    router.replace("/settings/subscription");
    return null;
  }

  return (
    <Container>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View className="px-sp-4 pb-sp-8">
          <View className="mb-sp-8">
            <View className="flex-row items-center gap-sp-2 mb-sp-4">
              <Crown className="w-sp-8 h-sp-8 text-primary" />
              <Text className="font-bold text-foreground text-2xl">
                Reem Pro
              </Text>
            </View>
            <Text className="text-muted-foreground text-lg">
              Unlock unlimited tasks and premium features.
            </Text>
          </View>

          <Card className="mb-sp-6 overflow-hidden">
            <View className="px-sp-6 py-sp-8 text-center">
              <Sparkles className="w-sp-12 h-sp-12 text-primary mx-auto mb-sp-4" />
              <Text className="font-bold text-foreground text-xl mb-sp-2">
                Unlimited tasks
              </Text>
              <Text className="text-muted-foreground text-sm">
                Free users are limited to {FREE_DAILY_LIMIT} tasks per day. Pro
                users get unlimited task execution.
              </Text>
            </View>
          </Card>

          <Card className="mb-sp-6 overflow-hidden">
            <View className="px-sp-6 py-sp-6">
              <Text className="font-semibold text-foreground mb-sp-4">
                Pro features
              </Text>
              <View className="space-y-sp-3">
                <View className="flex-row items-start gap-sp-3">
                  <Check className="w-sp-5 h-sp-5 text-green-500 shrink-0 mt-sp-0.5" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Unlimited daily tasks
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-sp-0.5">
                      No more {FREE_DAILY_LIMIT}/day limit
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-sp-3">
                  <Check className="w-sp-5 h-sp-5 text-green-500 shrink-0 mt-sp-0.5" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Cross-device sync
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-sp-0.5">
                      Settings, memory, and history synced via Firebase
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-sp-3">
                  <Check className="w-sp-5 h-sp-5 text-green-500 shrink-0 mt-sp-0.5" />
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Priority support
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-sp-0.5">
                      Faster response times for Pro users
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>

          <Button
            onPress={handleUpgrade}
            disabled={busy}
            className="w-sp-64 mx-auto"
            loading={busy}
          >
            <View className="flex-row items-center justify-center gap-sp-2">
              <Crown className="w-sp-5 h-sp-5 fill-white" />
              <Text>Upgrade to Pro</Text>
            </View>
          </Button>

          <View className="mt-sp-6 text-center">
            <Text className="text-xs text-muted-foreground">
              Upgrades are processed through your account. Restore purchases in
              settings.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Container>
  );
}

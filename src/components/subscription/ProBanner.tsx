import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSubscription } from "@/modules/subscription/useSubscription";

export function ProBanner() {
  const { isPro, tasksUsed, dailyLimit, tasksRemaining, upgradeToPro } = useSubscription();

  if (isPro) return null;

  const isNearLimit = tasksRemaining <= 3 && tasksRemaining > 0;
  const isAtLimit = tasksRemaining === 0;

  return (
    <Card className="overflow-hidden">
      <View className="px-sp-4 py-sp-3 flex-row items-center justify-between">
        <View className="flex-1 min-w-0">
          <Text className="font-semibold text-foreground">
            {isAtLimit
              ? "Daily task limit reached"
              : isNearLimit
                ? "Free tasks running low"
                : "Free task usage"}
          </Text>
          <Text className="text-xs text-muted-foreground mt-sp-0.5">
            {isAtLimit
              ? `You've used all ${dailyLimit} free tasks today. Upgrade to Pro for unlimited tasks.`
              : `${tasksUsed}/${dailyLimit} free tasks used today (${tasksRemaining} remaining).`}
          </Text>
        </View>
        {!isAtLimit ? (
          <Button onPress={upgradeToPro} size="sm" className="ml-sp-2">
            Upgrade
          </Button>
        ) : (
          <Button variant="destructive" onPress={upgradeToPro} size="sm" className="ml-sp-2">
            Upgrade to Pro
          </Button>
        )}
      </View>
    </Card>
  );
}

export function ProFeatureBadge() {
  return null; // Placeholder for pro feature badges in UI
}

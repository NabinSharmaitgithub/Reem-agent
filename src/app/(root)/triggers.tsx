import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Bell, Clock, Plus, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createDrizzleDb } from "@/core/db/repositories/shared";
import { TriggerRepository } from "@/modules/triggers/trigger-repository";

export default function TriggersListScreen() {
  const router = useRouter();
  const sqlite = useSQLiteContext();
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTriggers = useCallback(async () => {
    if (!sqlite) return;
    setLoading(true);
    try {
      const db = createDrizzleDb(sqlite);
      const repo = new TriggerRepository(db as any);
      const list = await repo.getTriggers();
      setTriggers(list);
    } catch (error) {
      console.error("[Triggers] Load failed:", error);
    } finally {
      setLoading(false);
    }
  }, [sqlite]);

  useEffect(() => {
    loadTriggers();
  }, [loadTriggers]);

  const toggleTrigger = async (id: string, enabled: boolean) => {
    if (!sqlite) return;
    try {
      const db = createDrizzleDb(sqlite);
      const repo = new TriggerRepository(db as any);
      await repo.setTriggerEnabled(id, enabled);
      loadTriggers();
    } catch (error) {
      Alert.alert(
        "Failed",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const deleteTrigger = async (id: string) => {
    if (!sqlite) return;
    try {
      const db = createDrizzleDb(sqlite);
      const repo = new TriggerRepository(db as any);
      await repo.deleteTrigger(id);
      loadTriggers();
    } catch (error) {
      Alert.alert(
        "Failed",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card className="overflow-hidden mb-sp-3">
      <View className="px-sp-4 py-sp-3 flex-row items-center justify-between">
        <View className="flex-1 min-w-0">
          <Text className="font-medium text-foreground">{item.title}</Text>
          <Text className="text-xs text-muted-foreground mt-sp-0.5">
            {item.type === "notification"
              ? `Notification from ${item.notificationAppName ?? item.notificationAppPackage ?? "app"}`
              : `Scheduled: ${item.cronExpression ?? item.time ?? "custom"} | ${item.weekdays?.join(", ") ?? ""}`}
          </Text>
          <Text className="text-xs text-muted-foreground mt-sp-1">
            {item.triggerCount} triggered · {item.lastTriggeredAt ?? "Never"}
          </Text>
        </View>
        <View className="flex-row gap-sp-2">
          <Switch
            value={item.enabled}
            onValueChange={() => toggleTrigger(item.id, !item.enabled)}
          />
          <TouchableOpacity
            onPress={() => {
              router.push(`/triggers/${item.id}`);
            }}
            className="p-sp-2"
          >
            <Clock className="w-sp-5 h-sp-5 text-muted-foreground" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => deleteTrigger(item.id)}
            className="p-sp-2"
          >
            <Trash2 className="w-sp-5 h-sp-5 text-destructive" />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  return (
    <Container>
      <View className="px-sp-4 pb-sp-8">
        <View className="flex-row items-center justify-between mb-sp-4">
          <View>
            <Text className="font-bold text-foreground text-lg">Triggers</Text>
            <Text className="text-muted-foreground text-sm">
              Automate Reem with scheduled or notification-based triggers.
            </Text>
          </View>
          <Button
            onPress={() => router.push("/triggers/create")}
            icon={<Plus className="w-sp-4 h-sp-4" />}
            size="sm"
          >
            New trigger
          </Button>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-muted-foreground">Loading triggers...</Text>
          </View>
        ) : triggers.length === 0 ? (
          <Card className="p-sp-8 text-center">
            <Bell className="w-sp-12 h-sp-12 text-muted-foreground mx-auto mb-sp-4" />
            <Text className="text-sm text-muted-foreground">
              No triggers yet. Create your first trigger to automate Reem.
            </Text>
          </Card>
        ) : (
          <FlatList
            data={triggers}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </Container>
  );
}

function Switch({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onValueChange}
      className={`w-sp-10 h-sp-5 rounded-full px-sp-2 ${
        value ? "bg-primary" : "bg-border dark:bg-background-dark"
      }`}
    >
      <View
        className={`w-sp-4 h-sp-4 rounded-full bg-white ${
          value ? "translate-x-sp-5" : "translate-x-sp-0.5"
        }`}
      />
    </TouchableOpacity>
  );
}

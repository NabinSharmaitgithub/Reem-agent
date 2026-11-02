import { useSQLiteContext } from "expo-sqlite";
import { Activity, Clock } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { FlatList, ScrollView, Text, View } from "react-native";

import { Container } from "@/components/shared/container";
import { Card } from "@/components/ui/card";
import { createDrizzleDb } from "@/core/db/repositories/shared";
import { MemoryRepository } from "@/modules/memory/memory-repository";

export type MemoryEventItem = {
  id: string;
  kind: "created" | "updated" | "deleted";
  memoryId: string;
  content: string;
  previousContent: string | null;
  reason: string | null;
  createdAt: string;
  category?: string;
};

export default function MemoryEventsScreen() {
  const sqlite = useSQLiteContext();
  const [events, setEvents] = useState<MemoryEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    if (!sqlite) return;
    setLoading(true);
    try {
      const db = createDrizzleDb(sqlite);
      const repo = new MemoryRepository(db as any);
      const entries = await repo.getEntries(false);
      // Build synthetic events from entry metadata since we don't have
      // a separate events table yet
      const eventItems: MemoryEventItem[] = entries.map((entry) => ({
        id: `evt-${entry.id}`,
        kind: entry.archivedAt ? "deleted" : "updated",
        memoryId: entry.id,
        content: entry.content,
        previousContent: null,
        reason: null,
        createdAt: entry.createdAt,
        category: entry.category,
      }));
      setEvents(
        eventItems.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
    } catch (error) {
      console.error("[MemoryEvents] Load failed:", error);
    } finally {
      setLoading(false);
    }
  }, [sqlite]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const kindColor = (kind: string) => {
    switch (kind) {
      case "created":
        return "text-green-600 dark:text-green-400";
      case "updated":
        return "text-primary";
      case "deleted":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const kindLabel = (kind: string) => {
    switch (kind) {
      case "created":
        return "Created";
      case "updated":
        return "Updated";
      case "deleted":
        return "Deleted";
      default:
        return kind;
    }
  };

  return (
    <Container>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View className="px-sp-4 pb-sp-8">
          <View className="flex-row items-center gap-sp-2 mb-sp-4">
            <Clock className="w-sp-5 h-sp-5 text-primary" />
            <Text className="font-bold text-foreground text-lg">
              Memory events
            </Text>
          </View>
          <Text className="text-muted-foreground text-sm mb-sp-4">
            History of memory entry changes (create, update, archive).
          </Text>

          {loading ? (
            <View className="flex-1 items-center justify-center py-sp-10">
              <Text className="text-muted-foreground">Loading events...</Text>
            </View>
          ) : events.length === 0 ? (
            <Card className="p-sp-8 text-center">
              <Activity className="w-sp-12 h-sp-12 text-muted-foreground mx-auto mb-sp-4" />
              <Text className="text-sm text-muted-foreground">
                No memory events yet.
              </Text>
            </Card>
          ) : (
            <FlatList
              data={events}
              renderItem={({ item }) => (
                <Card className="overflow-hidden mb-sp-3">
                  <View className="px-sp-4 py-sp-3 flex-row items-start justify-between gap-sp-3">
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-sp-2 mb-sp-1">
                        <Text
                          className={`text-xs font-medium ${kindColor(item.kind)}`}
                        >
                          {kindLabel(item.kind)}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {item.category?.toUpperCase() ?? ""}
                        </Text>
                      </View>
                      <Text className="text-sm text-foreground line-clamp-2">
                        {item.content}
                      </Text>
                      {item.reason && (
                        <Text className="text-xs text-muted-foreground mt-sp-1">
                          {item.reason}
                        </Text>
                      )}
                    </View>
                    <Text className="text-[10px] text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </View>
                </Card>
              )}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </View>
      </ScrollView>
    </Container>
  );
}

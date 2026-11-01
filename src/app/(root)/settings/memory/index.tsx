import { HardDrive } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

import { Container } from "@/components/shared/container";
import { Card } from "@/components/ui/card";
import { createDrizzleDb } from "@/core/db/repositories/shared";
import { useConfig } from "@/hooks/use-config";
import { MemoryRepository } from "@/modules/memory/memory-repository";
import { useSQLiteContext } from "expo-sqlite";

export default function MemorySettingsScreen() {
  const sqlite = useSQLiteContext();
  const { memoryEnabled, updateMemoryEnabled } = useConfig();
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadMemories = useCallback(async () => {
    if (!sqlite) return;
    setLoading(true);
    try {
      const db = createDrizzleDb(sqlite);
      const repo = new MemoryRepository(db as any);
      const list = await repo.getEntries(true);
      setMemories(list);
    } catch (error) {
      console.error("[MemorySettings] Load failed:", error);
    } finally {
      setLoading(false);
    }
  }, [sqlite]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const filteredMemories = memories.filter((m) =>
    m.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleMemoryEnabled = async (enabled: boolean) => {
    try {
      await updateMemoryEnabled(enabled);
    } catch (error) {
      Alert.alert(
        "Memory",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const deleteMemory = async (id: string) => {
    if (!sqlite) return;
    try {
      const db = createDrizzleDb(sqlite);
      const repo = new MemoryRepository(db as any);
      await repo.deleteEntry(id);
      loadMemories();
    } catch (error) {
      Alert.alert(
        "Memory",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const archiveMemory = async (id: string) => {
    if (!sqlite) return;
    try {
      const db = createDrizzleDb(sqlite);
      const repo = new MemoryRepository(db as any);
      await repo.archiveEntry(id);
      loadMemories();
    } catch (error) {
      Alert.alert(
        "Memory",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card className="overflow-hidden mb-sp-3">
      <View className="px-sp-4 py-sp-3">
        <View className="flex-row items-start justify-between gap-sp-2 mb-sp-2">
          <Text className="font-medium text-foreground line-clamp-2">
            {item.content}
          </Text>
          <View className="flex-row gap-sp-1">
            <Pressable
              onPress={() => archiveMemory(item.id)}
              className="p-sp-1"
            >
              <Text className="text-xs text-muted-foreground">Archive</Text>
            </Pressable>
            <Pressable onPress={() => deleteMemory(item.id)} className="p-sp-1">
              <Text className="text-xs text-destructive">Delete</Text>
            </Pressable>
          </View>
        </View>
        <View className="flex-row items-center gap-sp-3 mt-sp-2">
          <Text
            className={`text-xs font-medium capitalize ${item.importance === "critical" ? "text-destructive" : item.importance === "high" ? "text-warning" : "text-muted-foreground"}`}
          >
            {item.importance}
          </Text>
          <Text className="text-xs text-muted-foreground">{item.category}</Text>
          {item.tags?.length && (
            <View className="flex-row gap-sp-1">
              {item.tags.slice(0, 3).map((tag: string, idx: number) => (
                <Text
                  key={idx}
                  className="text-[10px] px-sp-1 py-sp-0.5 bg-muted dark:bg-muted-dark rounded text-muted-foreground dark:text-muted-foreground-dark"
                >
                  #{tag}
                </Text>
              ))}
            </View>
          )}
          <Text className="text-xs text-muted-foreground ml-auto">
            {item.accessCount}x accessed
          </Text>
        </View>
        <View className="flex-row justify-between mt-sp-1">
          <Text className="text-[10px] text-muted-foreground">
            {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <Container>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View className="px-sp-4 pb-sp-8">
          <View className="flex-row items-center justify-between mb-sp-4">
            <View>
              <Text className="font-bold text-foreground text-lg">Memory</Text>
              <Text className="text-muted-foreground text-sm">
                Persistent personal memory for Reem across conversations.
              </Text>
            </View>
          </View>

          <Card className="overflow-hidden mb-sp-4">
            <View className="flex-row items-center justify-between px-sp-4 py-sp-3">
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  Memory enabled
                </Text>
                <Text className="text-xs text-muted-foreground mt-sp-0.5">
                  Reem can read and write persistent memory
                </Text>
              </View>
              <Switch
                value={memoryEnabled}
                onValueChange={toggleMemoryEnabled}
              />
            </View>
          </Card>

          <Card className="overflow-hidden mb-sp-4">
            <View className="px-sp-4 py-sp-3">
              <Text className="text-sm font-medium text-foreground mb-sp-3">
                Search memories
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-sp-2">
                  {[
                    "personal",
                    "preference",
                    "constraint",
                    "fact",
                    "goal",
                    "context",
                  ].map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setSearchQuery(cat)}
                      className={`px-sp-3 py-sp-1 rounded-lg border ${
                        searchQuery === cat
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background dark:bg-background-dark"
                      }`}
                    >
                      <Text className="text-xs text-foreground">{cat}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          </Card>

          {loading ? (
            <View className="flex-1 items-center justify-center py-sp-10">
              <Text className="text-muted-foreground">Loading memories...</Text>
            </View>
          ) : filteredMemories.length === 0 ? (
            <Card className="p-sp-8 text-center">
              <HardDrive className="w-sp-12 h-sp-12 text-muted-foreground mx-auto mb-sp-4" />
              <Text className="text-sm text-muted-foreground">
                No memories yet. Reem will save important facts about you
                automatically as you converse.
              </Text>
            </Card>
          ) : (
            <FlatList
              data={filteredMemories}
              renderItem={renderItem}
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

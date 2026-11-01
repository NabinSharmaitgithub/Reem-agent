import { useSQLiteContext } from "expo-sqlite";
import { BarChart3 } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Container } from "@/components/shared/container";
import { Card } from "@/components/ui/card";
import { createDrizzleDb } from "@/core/db/repositories/shared";
import { MemoryRepository } from "@/modules/memory/memory-repository";

type CategoryStat = { name: string; count: number; color: string };

const CATEGORY_COLORS: Record<string, string> = {
  personal: "#3B82F6",
  preference: "#10B981",
  constraint: "#F59E0B",
  fact: "#6366F1",
  goal: "#8B5CF6",
  context: "#EC4899",
};

export default function MemoryAnalyticsScreen() {
  const sqlite = useSQLiteContext();
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!sqlite) return;
    setLoading(true);
    try {
      const db = createDrizzleDb(sqlite);
      const repo = new MemoryRepository(db as any);
      const s = await repo.getStats();
      setStats(s);
    } catch (error) {
      console.error("[MemoryAnalytics] Load failed:", error);
    } finally {
      setLoading(false);
    }
  }, [sqlite]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const categoryItems: CategoryStat[] = [
    {
      name: "Personal",
      count: stats.byCategory?.personal ?? 0,
      color: CATEGORY_COLORS.personal,
    },
    {
      name: "Preference",
      count: stats.byCategory?.preference ?? 0,
      color: CATEGORY_COLORS.preference,
    },
    {
      name: "Constraint",
      count: stats.byCategory?.constraint ?? 0,
      color: CATEGORY_COLORS.constraint,
    },
    {
      name: "Fact",
      count: stats.byCategory?.fact ?? 0,
      color: CATEGORY_COLORS.fact,
    },
    {
      name: "Goal",
      count: stats.byCategory?.goal ?? 0,
      color: CATEGORY_COLORS.goal,
    },
    {
      name: "Context",
      count: stats.byCategory?.context ?? 0,
      color: CATEGORY_COLORS.context,
    },
  ];

  const importanceItems: CategoryStat[] = [
    {
      name: "Critical",
      count: stats.byImportance?.critical ?? 0,
      color: "#EF4444",
    },
    { name: "High", count: stats.byImportance?.high ?? 0, color: "#F97316" },
    {
      name: "Medium",
      count: stats.byImportance?.medium ?? 0,
      color: "#EAB308",
    },
    { name: "Low", count: stats.byImportance?.low ?? 0, color: "#84CC16" },
  ];

  return (
    <Container>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View className="px-sp-4 pb-sp-8">
          <View className="flex-row items-center gap-sp-2 mb-sp-4">
            <BarChart3 className="w-sp-5 h-sp-5 text-primary" />
            <Text className="font-bold text-foreground text-lg">
              Memory analytics
            </Text>
          </View>
          <Text className="text-muted-foreground text-sm mb-sp-4">
            Insights into your persistent memory usage and distribution.
          </Text>

          {loading ? (
            <View className="flex-1 items-center justify-center py-sp-10">
              <Text className="text-muted-foreground">
                Loading analytics...
              </Text>
            </View>
          ) : null}

          {!loading && (
            <>
              <Card className="overflow-hidden mb-sp-4">
                <View className="px-sp-4 py-sp-4">
                  <Text className="font-semibold text-foreground mb-sp-3">
                    Overview
                  </Text>
                  <View className="grid grid-cols-2 gap-sp-4">
                    <View className="p-sp-3 rounded-lg bg-background dark:bg-background-dark border border-border dark:border-border-dark">
                      <Text className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Total entries
                      </Text>
                      <Text className="text-2xl font-bold text-foreground">
                        {stats.totalEntries ?? 0}
                      </Text>
                    </View>
                    <View className="p-sp-3 rounded-lg bg-background dark:bg-background-dark border border-border dark:border-border-dark">
                      <Text className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Enabled
                      </Text>
                      <Text className="text-2xl font-bold text-foreground">
                        {stats.enabledEntries ?? 0}
                      </Text>
                    </View>
                    <View className="p-sp-3 rounded-lg bg-background dark:bg-background-dark border border-border dark:border-border-dark">
                      <Text className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Archived
                      </Text>
                      <Text className="text-2xl font-bold text-foreground">
                        {stats.archivedEntries ?? 0}
                      </Text>
                    </View>
                    <View className="p-sp-3 rounded-lg bg-background dark:bg-background-dark border border-border dark:border-border-dark">
                      <Text className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Total accesses
                      </Text>
                      <Text className="text-2xl font-bold text-foreground">
                        {stats.totalAccessCount ?? 0}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>

              <Card className="overflow-hidden mb-sp-4">
                <View className="px-sp-4 py-sp-4">
                  <Text className="font-semibold text-foreground mb-sp-3">
                    By category
                  </Text>
                  <View className="space-y-sp-2">
                    {categoryItems.map((item) => (
                      <View
                        key={item.name}
                        className="flex-row items-center justify-between px-sp-3 py-sp-1.5 rounded-lg border border-border dark:border-border-dark"
                      >
                        <View className="flex-row items-center gap-sp-2">
                          <View
                            className={`w-sp-2 h-sp-2 rounded-full bg-${item.color}`}
                          />
                          <Text className="text-sm text-foreground">
                            {item.name}
                          </Text>
                        </View>
                        <Text className="text-sm font-medium text-foreground">
                          {item.count}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Card>

              <Card className="overflow-hidden mb-sp-4">
                <View className="px-sp-4 py-sp-4">
                  <Text className="font-semibold text-foreground mb-sp-3">
                    By importance
                  </Text>
                  <View className="space-y-sp-2">
                    {importanceItems.map((item) => (
                      <View
                        key={item.name}
                        className="flex-row items-center justify-between px-sp-3 py-sp-1.5 rounded-lg border border-border dark:border-border-dark"
                      >
                        <View className="flex-row items-center gap-sp-2">
                          <View
                            className={`w-sp-2 h-sp-2 rounded-full bg-${item.color}`}
                          />
                          <Text className="text-sm text-foreground capitalize">
                            {item.name}
                          </Text>
                        </View>
                        <Text className="text-sm font-medium text-foreground">
                          {item.count}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Card>

              <Card className="overflow-hidden">
                <View className="px-sp-4 py-sp-4">
                  <Text className="font-semibold text-foreground mb-sp-3">
                    Last updated
                  </Text>
                  <View className="p-sp-3 rounded-lg bg-background dark:bg-background-dark border border-border dark:border-border-dark">
                    <Text className="text-sm text-muted-foreground">
                      {stats.lastUpdatedAt
                        ? new Date(stats.lastUpdatedAt).toLocaleString()
                        : "Never"}
                    </Text>
                  </View>
                </View>
              </Card>
            </>
          )}
        </View>
      </ScrollView>
    </Container>
  );
}

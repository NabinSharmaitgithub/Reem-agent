import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Clipboard from "expo-clipboard";
import {
  Activity,
  CheckCircle2,
  Clock,
  Download,
  MoreVertical,
  Play,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Container } from "@/components/shared/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createDrizzleDb } from "@/core/db/repositories/shared";
import { agentRuns } from "@/core/db/schema";
import { desc, eq } from "drizzle-orm";

export type TaskHistoryItem = {
  id: string;
  title: string;
  status: AgentRunStatus;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  toolCount: number;
  durationMs: number | null;
  modelId: string;
  providerId: string;
};

export type AgentRunStatus =
  | "queued"
  | "running"
  | "waiting_for_approval"
  | "waiting_for_question"
  | "completed"
  | "failed"
  | "canceled"
  | "resumable"
  | "retrying";

type StatusFilter = "all" | "completed" | "failed" | "canceled" | "running";

const STATUS_CONFIG: Record<
  AgentRunStatus,
  { label: string; color: string; icon: React.ComponentType<any> }
> = {
  queued: { label: "Queued", color: "text-primary", icon: Clock },
  running: { label: "Running", color: "text-primary", icon: Activity },
  waiting_for_approval: {
    label: "Waiting for Approval",
    color: "text-warning",
    icon: Clock,
  },
  waiting_for_question: {
    label: "Waiting for Question",
    color: "text-warning",
    icon: Clock,
  },
  completed: { label: "Completed", color: "text-success", icon: CheckCircle2 },
  failed: { label: "Failed", color: "text-destructive", icon: XCircle },
  canceled: { label: "Canceled", color: "text-muted", icon: XCircle },
  resumable: { label: "Resumable", color: "text-warning", icon: Play },
  retrying: { label: "Retrying", color: "text-primary", icon: Activity },
};

export default function TaskHistoryScreen() {
  const router = useRouter();
  const sqlite = useSQLiteContext();
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!sqlite) return;
    setLoading(true);
    try {
      const db = createDrizzleDb(sqlite);
      const rows = await db
        .select()
        .from(agentRuns)
        .orderBy(desc(agentRuns.startedAt))
        .limit(100);

      const items: TaskHistoryItem[] = rows.map((row: any) => {
        const started = new Date(row.startedAt).getTime();
        const completed = row.completedAt
          ? new Date(row.completedAt).getTime()
          : null;
        const durationMs = completed ? completed - started : null;

        return {
          id: row.id,
          title: row.input || "Untitled run",
          status: row.status as AgentRunStatus,
          startedAt: row.startedAt,
          completedAt: row.completedAt,
          error: row.lastError,
          toolCount: 0,
          durationMs,
          modelId: row.modelId,
          providerId: row.providerId,
        };
      });
      setHistory(items);
    } catch (error) {
      console.error("[History] Load failed:", error);
      Alert.alert("History", "Failed to load task history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sqlite]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredHistory = useMemo(() => {
    if (statusFilter === "all") return history;
    return history.filter((h) => h.status === statusFilter);
  }, [history, statusFilter]);

  const statusConfig = (status: AgentRunStatus) =>
    STATUS_CONFIG[status] ?? STATUS_CONFIG.queued;

  const formatDuration = (ms: number | null) => {
    if (!ms) return null;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateTitle = (title: string, maxLen = 60) => {
    if (title.length <= maxLen) return title;
    return title.slice(0, maxLen) + "…";
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
  };

  const handleRetryRun = async (item: TaskHistoryItem) => {
    try {
      Alert.alert("Re-run Task", "Re-run this task with the same input?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Re-run",
          onPress: async () => {
            router.push(`/`);
          },
        },
      ]);
    } catch {
      Alert.alert("History", "Failed to re-run task.");
    }
  };

  const handleDeleteRun = async (id: string) => {
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const db = createDrizzleDb(sqlite);
              await db.delete(agentRuns).where(eq(agentRuns.id, id));
              setHistory((prev) => prev.filter((h) => h.id !== id));
            } catch {
              Alert.alert("History", "Failed to delete task record.");
            }
          },
        },
      ],
    );
  };

  const handleExport = () => {
    setShowExport(true);
  };

  const exportCsv = () => {
    const headers =
      "ID,Title,Status,Started At,Completed At,Duration (ms),Error\n";
    const rows = history
      .map(
        (h) =>
          `"${h.id}","${h.title.replace(/"/g, '""')}","${h.status}","${h.startedAt}","${h.completedAt ?? ""}","${h.durationMs ?? ""}","${(h.error ?? "").replace(/"/g, '""')}"`,
      )
      .join("\n");
    const csv = headers + rows;

    Clipboard.setStringAsync(csv)
      .then(() =>
        Alert.alert("Export", "Task history CSV copied to clipboard."),
      )
      .catch(() =>
        Alert.alert("Export", "Could not copy the task history CSV."),
      );
  };

  if (showExport) {
    exportCsv();
    setShowExport(false);
  }

  return (
    <Container>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="px-sp-4 pb-sp-8">
          <View className="flex-row items-center justify-between mb-sp-4">
            <View>
              <Text className="font-bold text-foreground text-lg">
                Task Logs & History
              </Text>
              <Text className="text-muted-foreground text-sm">
                View past agent runs with status, timestamps, and duration.
              </Text>
            </View>
            <View className="flex-row gap-sp-2">
              <Button
                onPress={handleRefresh}
                icon={<RefreshCw className="w-sp-4 h-sp-4" />}
                size="sm"
                loading={refreshing}
              />
              <Button
                onPress={handleExport}
                icon={<Download className="w-sp-4 h-sp-4" />}
                size="sm"
                variant="outline"
              >
                Export
              </Button>
            </View>
          </View>

          {/* Status Filter */}
          <Card className="overflow-hidden mb-sp-4">
            <View className="px-sp-4 py-sp-3 flex-row gap-sp-2">
              {[
                "all" as StatusFilter,
                "completed",
                "failed",
                "canceled",
                "running",
              ].map((filter) => {
                const isActive = statusFilter === filter;
                const label =
                  filter === "all"
                    ? "All"
                    : filter.charAt(0).toUpperCase() + filter.slice(1);
                return (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => setStatusFilter(filter as StatusFilter)}
                    className={`flex-row items-center gap-sp-1 px-sp-3 py-sp-1.5 rounded-lg border ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background dark:bg-background-dark text-muted-foreground dark:text-muted-foreground-dark"
                    }`}
                  >
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </Badge>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {loading ? (
            <View className="flex-1 items-center justify-center py-sp-10">
              <Text className="text-muted-foreground">
                Loading task history…
              </Text>
            </View>
          ) : filteredHistory.length === 0 ? (
            <Card className="p-sp-8 text-center">
              <Activity className="w-sp-12 h-sp-12 text-muted-foreground mx-auto mb-sp-4" />
              <Text className="text-sm text-muted-foreground">
                {statusFilter === "all"
                  ? "No task history yet. Runs will appear here as they complete."
                  : `No ${statusFilter} tasks found.`}
              </Text>
              {statusFilter !== "all" && (
                <Button
                  onPress={() => setStatusFilter("all")}
                  size="sm"
                  mt-sp-3
                >
                  Show all tasks
                </Button>
              )}
            </Card>
          ) : (
            <FlatList
              data={filteredHistory}
              renderItem={({ item }) => {
                const config = statusConfig(item.status);
                const duration = formatDuration(item.durationMs);
                return (
                  <Pressable onPress={() => router.push(`/history/${item.id}`)}>
                    <Card className="overflow-hidden mb-sp-3">
                      <View className="px-sp-4 py-sp-3 flex-row items-start justify-between gap-sp-3">
                        <View className="flex-1 min-w-0">
                          <View className="flex-row items-center gap-sp-2 mb-sp-1">
                            <Badge variant="outline" className="text-[10px]">
                              {config.label}
                            </Badge>
                            {item.status === "resumable" && (
                              <Badge
                                variant="destructive"
                                className="text-[10px]"
                              >
                                Resumable
                              </Badge>
                            )}
                          </View>
                          <Text
                            className="font-medium text-foreground line-clamp-1"
                            numberOfLines={1}
                          >
                            {truncateTitle(item.title)}
                          </Text>
                          <View className="flex-row items-center gap-sp-3 mt-sp-1">
                            <Text className="text-xs text-muted-foreground">
                              {formatDate(item.startedAt)}
                            </Text>
                            {duration && (
                              <View className="w-sp-1 h-sp-1 bg-border dark:bg-border-dark rounded-full" />
                            )}
                            {duration && (
                              <Text className="text-xs text-muted-foreground">
                                {duration}
                              </Text>
                            )}
                          </View>
                          {item.error && (
                            <Text className="text-xs text-destructive mt-sp-1 line-clamp-2">
                              {item.error}
                            </Text>
                          )}
                        </View>
                        <View className="flex-row gap-sp-1">
                          <TouchableOpacity
                            onPress={(e) => {
                              e.preventDefault();
                              handleRetryRun(item);
                            }}
                            className="p-sp-1.5"
                          >
                            <Play className="w-sp-4 h-sp-4 text-primary" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.preventDefault();
                              handleDeleteRun(item.id);
                            }}
                            className="p-sp-1.5"
                          >
                            <Trash2 className="w-sp-4 h-sp-4 text-destructive" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.preventDefault();
                              router.push(`/history/${item.id}`);
                            }}
                            className="p-sp-1.5"
                          >
                            <MoreVertical className="w-sp-4 h-sp-4 text-muted-foreground" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                );
              }}
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

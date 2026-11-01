import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  Activity,
  CheckCircle2,
  Clock,
  Play,
  XCircle,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { Container } from "@/components/shared/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createDrizzleDb } from "@/core/db/repositories/shared";
import { agentRuns, messages } from "@/core/db/schema";
import type { MessageMetadata } from "@/core/types/app-state";
import { eq } from "drizzle-orm";

export type TaskDetailItem = {
  id: string;
  title: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  modelId: string;
  providerId: string;
  toolExecutions: any[];
  reasoning: any[];
  durationMs: number | null;
};

type AgentRunStatus =
  | "queued"
  | "running"
  | "waiting_for_approval"
  | "waiting_for_question"
  | "completed"
  | "failed"
  | "canceled"
  | "resumable"
  | "retrying";

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

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const sqlite = useSQLiteContext();

  const [task, setTask] = useState<TaskDetailItem | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTask = useCallback(async () => {
    if (!sqlite || !id) return;
    setLoading(true);
    try {
      const db = createDrizzleDb(sqlite);
      const [row] = await db
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.id, id))
        .limit(1);

      if (!row) {
        setLoading(false);
        return;
      }

      const started = new Date(row.startedAt).getTime();
      const completed = row.completedAt
        ? new Date(row.completedAt).getTime()
        : null;
      const durationMs = completed ? completed - started : null;

      const [assistantMessage] = await db
        .select({ metadata: messages.metadata })
        .from(messages)
        .where(eq(messages.id, row.assistantMessageId))
        .limit(1);
      const metadata: MessageMetadata | null =
        assistantMessage?.metadata ?? null;

      setTask({
        id: row.id,
        title: row.input || "Untitled task",
        status: row.status,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        error: row.lastError,
        modelId: row.modelId,
        providerId: row.providerId,
        toolExecutions: metadata?.toolExecutions ?? [],
        reasoning: metadata?.reasoning ?? [],
        durationMs,
      });
    } catch (error) {
      console.error("[TaskDetail] Load failed:", error);
      Alert.alert("Task Detail", "Failed to load task details.");
    } finally {
      setLoading(false);
    }
  }, [sqlite, id]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const statusConfig = (status: string) =>
    STATUS_CONFIG[status as AgentRunStatus] ?? STATUS_CONFIG.queued;

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

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

  const truncateText = (text: string, maxLen = 100) => {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + "…";
  };

  const handleReRun = async () => {
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
      Alert.alert("Task Detail", "Failed to re-run task.");
    }
  };

  const handleDeleteTask = async () => {
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
              await db.delete(agentRuns).where(eq(agentRuns.id, id!));
              router.push(`/history`);
            } catch {
              Alert.alert("Task Detail", "Failed to delete task record.");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <Container>
        <View className="flex-1 items-center justify-center py-sp-10">
          <Activity className="w-sp-12 h-sp-12 text-primary" />
          <Text className="text-muted-foreground mt-sp-4">Loading task…</Text>
        </View>
      </Container>
    );
  }

  if (!task) {
    return (
      <Container>
        <Card className="p-sp-8 text-center">
          <XCircle className="w-sp-12 h-sp-12 text-destructive mx-auto mb-sp-4" />
          <Text className="font-medium text-foreground">Task not found</Text>
          <Text className="text-sm text-muted-foreground mt-sp-2">
            The requested task record does not exist.
          </Text>
        </Card>
      </Container>
    );
  }

  const config = statusConfig(task.status);

  return (
    <Container>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View className="px-sp-4 pb-sp-8">
          {/* Header */}
          <View className="mb-sp-6">
            <View className="flex-row items-center justify-between mb-sp-3">
              <View className="flex-1 min-w-0">
                <Text className="font-bold text-foreground text-lg">
                  Task Detail
                </Text>
                <Text className="text-xs text-muted-foreground mt-sp-0.5">
                  Task ID: {task.id}
                </Text>
              </View>
              <View className="flex-row gap-sp-2">
                <Button
                  onPress={handleReRun}
                  icon={<Play className="w-sp-4 h-sp-4" />}
                  size="sm"
                  disabled={task.status === "running"}
                >
                  Re-run
                </Button>
                <Button
                  onPress={handleDeleteTask}
                  variant="destructive"
                  size="sm"
                >
                  Delete
                </Button>
              </View>
            </View>
            <View className="flex-row items-center gap-sp-3 mb-sp-3">
              <Badge variant="outline" className="text-[10px]">
                {config.label}
              </Badge>
              {task.status === "resumable" && (
                <Badge variant="destructive" className="text-[10px]">
                  Resumable
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                {task.modelId}
              </Badge>
            </View>
            <Text className="text-sm text-muted-foreground">
              Started: {formatDate(task.startedAt)}
              {task.completedAt
                ? ` · Completed: ${formatDate(task.completedAt)}`
                : ""}
              {task.durationMs
                ? ` · Duration: ${formatDuration(task.durationMs)}`
                : ""}
            </Text>
          </View>

          {/* Error Section */}
          {task.error && (
            <Card className="overflow-hidden mb-sp-6">
              <View className="px-sp-4 py-sp-3 border-l-4 border-destructive bg-destructive/10 dark:bg-destructive/5">
                <View className="flex-row items-start gap-sp-3">
                  <XCircle className="w-sp-5 h-sp-5 text-destructive shrink-0 mt-sp-0.5" />
                  <View className="flex-1">
                    <Text className="font-medium text-destructive mb-sp-1">
                      Error
                    </Text>
                    <Text className="text-sm text-destructive dark:text-destructive-dark line-clamp-3">
                      {task.error}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          )}

          {/* Tool Executions */}
          {(task.toolExecutions?.length ?? 0) > 0 && (
            <Card className="overflow-hidden mb-sp-6">
              <View className="px-sp-4 py-sp-3 border-b border-border dark:border-border-dark">
                <Text className="font-medium text-foreground">
                  Tool Executions ({task.toolExecutions.length})
                </Text>
              </View>
              <View className="divide-y divide-border dark:divide-border-dark">
                {task.toolExecutions.map((tool, idx) => (
                  <View key={tool.id || idx} className="px-sp-4 py-sp-3">
                    <View className="flex-row items-start justify-between gap-sp-2 mb-sp-1">
                      <View className="flex-1 min-w-0">
                        <Text className="font-medium text-foreground text-sm">
                          {tool.toolName || "unknown_tool"}
                        </Text>
                        <Badge
                          variant={
                            tool.status === "completed"
                              ? "default"
                              : tool.status === "failed"
                                ? "destructive"
                                : "outline"
                          }
                          className="text-[10px]"
                        >
                          {tool.status}
                        </Badge>
                      </View>
                      <Text className="text-[10px] text-muted-foreground">
                        {new Date(tool.createdAt).toLocaleTimeString()}
                      </Text>
                    </View>
                    <View className="mb-sp-2">
                      <Text className="text-[10px] font-medium text-muted-foreground mb-sp-1">
                        Input
                      </Text>
                      <Text
                        className="text-sm text-foreground font-mono bg-background dark:bg-background-dark p-sp-2 rounded-md"
                        numberOfLines={3}
                      >
                        {truncateText(tool.inputSummary || "N/A")}
                      </Text>
                    </View>
                    {(tool.outputSummary || tool.error) && (
                      <View className="mb-sp-2">
                        <Text className="text-[10px] font-medium text-muted-foreground mb-sp-1">
                          Output
                        </Text>
                        <Text
                          className={`text-sm font-mono p-sp-2 rounded-md ${
                            tool.status === "failed"
                              ? "text-destructive bg-destructive/10 dark:bg-destructive/5"
                              : "text-success bg-success/10 dark:bg-success/5"
                          }`}
                          numberOfLines={3}
                        >
                          {truncateText(
                            tool.outputSummary || tool.error || "N/A",
                          )}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Reasoning */}
          {(task.reasoning?.length ?? 0) > 0 && (
            <Card className="overflow-hidden mb-sp-6">
              <View className="px-sp-4 py-sp-3 border-b border-border dark:border-border-dark">
                <Text className="font-medium text-foreground">
                  Reasoning ({task.reasoning.length})
                </Text>
              </View>
              <View className="divide-y divide-border dark:divide-border-dark">
                {task.reasoning.map((r, idx) => (
                  <View key={idx} className="px-sp-4 py-sp-3">
                    <Text className="text-sm text-foreground line-clamp-3">
                      {r.content || r.text || JSON.stringify(r)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Metadata */}
          <Card className="overflow-hidden">
            <View className="px-sp-4 py-sp-3 border-b border-border dark:border-border-dark">
              <Text className="font-medium text-foreground">Metadata</Text>
            </View>
            <View className="px-sp-4 py-sp-3">
              <View className="flex-row items-start justify-between gap-sp-4 mb-sp-2">
                <View className="flex-1 min-w-0">
                  <Text className="text-[10px] font-medium text-muted-foreground uppercase">
                    Provider
                  </Text>
                  <Text className="text-sm text-foreground">
                    {task.providerId}
                  </Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-[10px] font-medium text-muted-foreground uppercase">
                    Model
                  </Text>
                  <Text className="text-sm text-foreground">
                    {task.modelId}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-start justify-between gap-sp-4">
                <View className="flex-1 min-w-0">
                  <Text className="text-[10px] font-medium text-muted-foreground uppercase">
                    Status
                  </Text>
                  <Text className="text-sm text-foreground">
                    {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  </Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-[10px] font-medium text-muted-foreground uppercase">
                    Tool Calls
                  </Text>
                  <Text className="text-sm text-foreground">
                    {task.toolExecutions?.length ?? 0}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </Container>
  );
}

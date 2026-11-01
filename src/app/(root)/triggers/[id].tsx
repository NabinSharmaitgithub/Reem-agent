import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Bell, ChevronLeft, Clock, Save } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createDrizzleDb } from "@/core/db/repositories/shared";
import { TriggerRepository } from "@/modules/triggers/trigger-repository";

type TriggerFormMode = "create" | "edit";

export default function TriggerCreateScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id && id !== "create" ? id : null;
  const sqlite = useSQLiteContext();
  const [mode, setMode] = useState<TriggerFormMode>("create");
  const [triggerId, setTriggerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"scheduled" | "notification">("scheduled");
  const [prompt, setPrompt] = useState("");
  const [providerId, setProviderId] = useState("");
  const [modelId, setModelId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [autoApprove, setAutoApprove] = useState(true);
  const [enabled, setEnabled] = useState(true);

  // Scheduled fields
  const [cronExpression, setCronExpression] = useState("");
  const [timezone, setTimezone] = useState("");
  const [time, setTime] = useState("");
  const [weekdays, setWeekdays] = useState<string[]>([]);

  // Notification fields
  const [notificationAppPackage, setNotificationAppPackage] = useState("");
  const [notificationAppName, setNotificationAppName] = useState("");

  const weekdayOptions = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const toggleWeekday = (day: string) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const loadTrigger = useCallback(
    async (id: string) => {
      if (!sqlite) return;
      try {
        const db = createDrizzleDb(sqlite);
        const repo = new TriggerRepository(db as any);
        const trigger = await repo.getTrigger(id);
        if (trigger) {
          setTriggerId(trigger.id);
          setTitle(trigger.title);
          setDescription(trigger.description ?? "");
          setType(trigger.type as any);
          setPrompt(trigger.prompt);
          setProviderId(trigger.providerId);
          setModelId(trigger.modelId);
          setAgentId(trigger.agentId ?? "");
          setAutoApprove(trigger.autoApprove);
          setEnabled(trigger.enabled);
          setCronExpression(trigger.cronExpression ?? "");
          setTimezone(trigger.timezone ?? "");
          setTime(trigger.time ?? "");
          setWeekdays(trigger.weekdays ?? []);
          setNotificationAppPackage(trigger.notificationAppPackage ?? "");
          setNotificationAppName(trigger.notificationAppName ?? "");
        }
      } catch (error) {
        console.error("[Trigger] Load failed:", error);
      } finally {
        setLoading(false);
      }
    },
    [sqlite],
  );

  useEffect(() => {
    if (editingId) {
      setMode("edit");
      setTriggerId(editingId);
      void loadTrigger(editingId);
    } else {
      setLoading(false);
    }
  }, [editingId, loadTrigger]);

  const saveTrigger = async () => {
    if (!title || !prompt || !providerId || !modelId) {
      Alert.alert("Missing info", "Please fill in all required fields.");
      return;
    }

    if (type === "scheduled" && !cronExpression && !time) {
      Alert.alert(
        "Missing info",
        "Please set a cron expression or time for scheduled triggers.",
      );
      return;
    }

    if (type === "notification" && !notificationAppPackage) {
      Alert.alert(
        "Missing info",
        "Please specify an app package name for notification triggers.",
      );
      return;
    }

    setSaving(true);
    try {
      const db = createDrizzleDb(sqlite);
      const repo = new TriggerRepository(db as any);

      const input: any = {
        title,
        description: description || undefined,
        type,
        prompt,
        providerId,
        modelId,
        agentId: agentId || undefined,
        autoApprove,
        enabled,
        cronExpression:
          type === "scheduled" ? cronExpression || undefined : undefined,
        timezone: type === "scheduled" ? timezone || undefined : undefined,
        weekdays:
          type === "scheduled"
            ? weekdays.length > 0
              ? weekdays
              : undefined
            : undefined,
        time: type === "scheduled" ? time || undefined : undefined,
        notificationAppPackage:
          type === "notification"
            ? notificationAppPackage || undefined
            : undefined,
        notificationAppName:
          type === "notification"
            ? notificationAppName || undefined
            : undefined,
      };

      if (mode === "edit" && triggerId) {
        await repo.updateTrigger({ id: triggerId, ...input });
      } else {
        await repo.createTrigger(input);
      }

      router.replace("/triggers");
    } catch (error: any) {
      Alert.alert("Save failed", error?.message ?? String(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="flex-1 items-center justify-center">
        <Text className="text-foreground">Loading trigger…</Text>
      </Container>
    );
  }

  return (
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <View className="px-sp-4 pb-sp-8">
            <View className="flex-row items-center gap-sp-2 mb-sp-6">
              <TouchableOpacity onPress={() => router.back()}>
                <ChevronLeft className="w-sp-5 h-sp-5 text-muted-foreground" />
              </TouchableOpacity>
              <Text className="font-bold text-foreground text-lg">
                {mode === "edit" ? "Edit trigger" : "Create trigger"}
              </Text>
            </View>

            <Card className="overflow-hidden mb-sp-4">
              <View className="px-sp-4 py-sp-4 space-y-sp-4">
                <Input
                  placeholder="Trigger title (e.g. 'Morning briefing')"
                  value={title}
                  onChangeText={setTitle}
                  className="mb-sp-3"
                />
                <Input
                  placeholder="Description (optional)"
                  value={description}
                  onChangeText={setDescription}
                  className="mb-sp-3"
                />
                <Input
                  placeholder="Agent prompt (what to do when triggered)"
                  value={prompt}
                  onChangeText={setPrompt}
                  multiline
                  numberOfLines={4}
                  className="mb-sp-3"
                />
                <View className="flex-row items-center gap-sp-3">
                  <Text className="text-sm text-muted-foreground">Type</Text>
                  <TouchableOpacity
                    onPress={() => setType("scheduled")}
                    className={`flex-row items-center justify-between px-sp-3 py-sp-2 rounded-lg border ${
                      type === "scheduled"
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background dark:bg-background-dark"
                    }`}
                  >
                    <Text className="text-sm text-foreground">Scheduled</Text>
                    <Clock
                      className={`w-sp-4 h-sp-4 ${type === "scheduled" ? "text-primary" : "text-muted-foreground"}`}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setType("notification")}
                    className={`flex-row items-center justify-between px-sp-3 py-sp-2 rounded-lg border ${
                      type === "notification"
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background dark:bg-background-dark"
                    }`}
                  >
                    <Text className="text-sm text-foreground">
                      Notification
                    </Text>
                    <Bell
                      className={`w-sp-4 h-sp-4 ${type === "notification" ? "text-primary" : "text-muted-foreground"}`}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>

            {type === "scheduled" && (
              <Card className="overflow-hidden mb-sp-4">
                <View className="px-sp-4 py-sp-4">
                  <Text className="font-semibold text-foreground mb-sp-3">
                    Schedule
                  </Text>
                  <Input
                    placeholder="Cron expression (e.g. 0 9 * * 1-5)"
                    value={cronExpression}
                    onChangeText={setCronExpression}
                    className="mb-sp-3"
                  />
                  <Input
                    placeholder="Timezone (e.g. America/New_York)"
                    value={timezone}
                    onChangeText={setTimezone}
                    className="mb-sp-3"
                  />
                  <Input
                    placeholder="Time (HH:MM)"
                    value={time}
                    onChangeText={setTime}
                    className="mb-sp-3"
                  />
                  <Text className="text-xs font-medium text-foreground mb-sp-2">
                    Weekdays
                  </Text>
                  <View className="flex-row flex-wrap gap-sp-2">
                    {weekdayOptions.map((day) => (
                      <TouchableOpacity
                        key={day}
                        onPress={() => toggleWeekday(day)}
                        className={`px-sp-3 py-sp-1.5 rounded-lg border ${
                          weekdays.includes(day)
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background dark:bg-background-dark"
                        }`}
                      >
                        <Text className="text-xs text-foreground">
                          {day.slice(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </Card>
            )}

            {type === "notification" && (
              <Card className="overflow-hidden mb-sp-4">
                <View className="px-sp-4 py-sp-4">
                  <Text className="font-semibold text-foreground mb-sp-3">
                    Notification trigger
                  </Text>
                  <Input
                    placeholder="App package name (e.g. com.whatsapp)"
                    value={notificationAppPackage}
                    onChangeText={setNotificationAppPackage}
                    className="mb-sp-3"
                  />
                  <Input
                    placeholder="App display name (optional)"
                    value={notificationAppName}
                    onChangeText={setNotificationAppName}
                    className="mb-sp-3"
                  />
                  <Text className="text-xs text-muted-foreground">
                    Reem will run this trigger when the specified app posts a
                    notification.
                  </Text>
                </View>
              </Card>
            )}

            <Card className="overflow-hidden mb-sp-4">
              <View className="px-sp-4 py-sp-4">
                <Text className="font-semibold text-foreground mb-sp-3">
                  Execution settings
                </Text>
                <View className="flex-row items-center justify-between px-sp-3 py-sp-2 border rounded-lg">
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      Auto-approve tool calls
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-sp-0.5">
                      Triggered runs approve tools automatically
                    </Text>
                  </View>
                  <Switch value={autoApprove} onValueChange={setAutoApprove} />
                </View>
                <View className="flex-row items-center justify-between px-sp-3 py-sp-2 border rounded-lg mt-sp-2">
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">Enabled</Text>
                    <Text className="text-xs text-muted-foreground mt-sp-0.5">
                      Toggle to disable without deleting
                    </Text>
                  </View>
                  <Switch value={enabled} onValueChange={setEnabled} />
                </View>
              </View>
            </Card>

            <Button
              onPress={saveTrigger}
              disabled={saving}
              className="w-full"
              loading={saving}
            >
              <View className="flex-row items-center justify-center gap-sp-2">
                <Save className="w-sp-4 h-sp-4" />
                <Text>
                  {mode === "edit" ? "Save changes" : "Create trigger"}
                </Text>
              </View>
            </Button>

            {mode === "edit" && triggerId && (
              <Button
                variant="destructive"
                onPress={() => {
                  Alert.alert(
                    "Delete trigger",
                    "Are you sure you want to delete this trigger?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        onPress: async () => {
                          if (!sqlite) return;
                          try {
                            const db = createDrizzleDb(sqlite);
                            const repo = new TriggerRepository(db as any);
                            await repo.deleteTrigger(triggerId);
                            router.replace("/triggers");
                          } catch (error: any) {
                            Alert.alert(
                              "Delete failed",
                              error?.message ?? String(error),
                            );
                          }
                        },
                      },
                    ],
                  );
                }}
                className="w-full"
              >
                Delete trigger
              </Button>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
}

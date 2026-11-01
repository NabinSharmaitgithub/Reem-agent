import { useSQLiteContext } from "expo-sqlite";
import { Heart, Plus, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Container } from "@/components/shared/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createDrizzleDb } from "@/core/db/repositories/shared";
import { MomentsRepository } from "@/modules/moments/moments-repository";
import type { Moment, MomentType } from "@/modules/moments/types";

type MomentTypeLabel = Record<MomentType, { label: string; color: string }>;

const MOMENT_TYPE_CONFIG: MomentTypeLabel = {
  success: { label: "Success", color: "text-success" },
  milestone: { label: "Milestone", color: "text-primary" },
  interaction: { label: "Interaction", color: "text-muted-foreground" },
};

export default function MomentsScreen() {
  const sqlite = useSQLiteContext();
  const [momentsList, setMomentsList] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCapture, setShowCapture] = useState(false);
  const [captureTitle, setCaptureTitle] = useState("");
  const [captureDescription, setCaptureDescription] = useState("");
  const [captureType, setCaptureType] = useState<MomentType>("interaction");
  const [captureTags, setCaptureTags] = useState<string[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<MomentType | "all">("all");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const loadMoments = useCallback(async () => {
    if (!sqlite) return;
    setLoading(true);
    try {
      const db = createDrizzleDb(sqlite);
      const repo = new MomentsRepository(db as any);
      const list = await repo.getMoments({
        type: typeFilter === "all" ? undefined : typeFilter,
        pinnedOnly,
      });
      setMomentsList(list);
    } catch (error) {
      console.error("[Moments] Load failed:", error);
    } finally {
      setLoading(false);
    }
  }, [sqlite, typeFilter, pinnedOnly]);

  useEffect(() => {
    loadMoments();
  }, [loadMoments]);

  const typeConfig = (type: MomentType) => MOMENT_TYPE_CONFIG[type];

  const filteredMoments = useMemo(() => {
    return momentsList.filter((m) => {
      if (typeFilter !== "all" && m.type !== typeFilter) return false;
      if (pinnedOnly && !m.pinned) return false;
      return true;
    });
  }, [momentsList, typeFilter, pinnedOnly]);

  const captureMoment = async () => {
    if (!captureTitle.trim()) {
      Alert.alert("Moments", "Please enter a title for the moment.");
      return;
    }

    setCapturing(true);
    try {
      const db = createDrizzleDb(sqlite);
      const repo = new MomentsRepository(db as any);
      await repo.createMoment({
        title: captureTitle.trim(),
        description: captureDescription.trim() || undefined,
        type: captureType,
        tags: captureTags.filter((t) => t.trim()).map((t) => t.trim()),
      });
      setCaptureTitle("");
      setCaptureDescription("");
      setCaptureType("interaction");
      setCaptureTags([]);
      setShowCapture(false);
      await loadMoments();
    } catch (error) {
      console.error("[Moments] Capture failed:", error);
      Alert.alert("Moments", "Failed to capture moment.");
    } finally {
      setCapturing(false);
    }
  };

  const togglePin = async (id: string) => {
    if (!sqlite) return;
    try {
      const db = createDrizzleDb(sqlite);
      const repo = new MomentsRepository(db as any);
      await repo.togglePin(id);
      await loadMoments();
    } catch (error) {
      console.error("[Moments] Toggle pin failed:", error);
    }
  };

  const deleteMoment = async (id: string) => {
    Alert.alert(
      "Delete Moment",
      "Are you sure you want to delete this moment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            if (!sqlite) return;
            try {
              const db = createDrizzleDb(sqlite);
              const repo = new MomentsRepository(db as any);
              await repo.deleteMoment(id);
              await loadMoments();
            } catch {
              Alert.alert("Moments", "Failed to delete moment.");
            }
          },
        },
      ],
    );
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderItem = ({ item }: { item: Moment }) => {
    const config = typeConfig(item.type);
    return (
      <Card className="overflow-hidden mb-sp-3">
        <View className="px-sp-4 py-sp-3">
          <View className="flex-row items-start justify-between gap-sp-2">
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-sp-2 mb-sp-1">
                <Badge variant="outline" className="text-[10px]">
                  {config.label}
                </Badge>
                {item.pinned && (
                  <Badge variant="destructive" className="text-[10px]">
                    Pinned
                  </Badge>
                )}
              </View>
              <Text
                className="font-medium text-foreground line-clamp-1"
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {item.description && (
                <Text className="text-sm text-muted-foreground mt-sp-1 line-clamp-2">
                  {item.description}
                </Text>
              )}
            </View>
            <View className="flex-row gap-sp-2">
              <TouchableOpacity
                onPress={() => togglePin(item.id)}
                className="p-sp-1.5"
              >
                <Heart
                  className={
                    "w-sp-4 h-sp-4 " +
                    (item.pinned ? "fill-red-500" : "text-muted-foreground")
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteMoment(item.id)}
                className="p-sp-1.5"
              >
                <Trash2 className="w-sp-4 h-sp-4 text-destructive" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-start gap-sp-2 mt-sp-2">
              {item.tags.map((tag) => (
                <Text
                  key={tag}
                  className={
                    "text-[10px] px-sp-1 py-sp-0.5 bg-muted dark:bg-muted-dark rounded text-muted-foreground dark:text-muted-foreground-dark"
                  }
                >
                  {"#" + tag}
                </Text>
              ))}
              <Text className="text-[10px] text-muted-foreground ml-auto">
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  const addTag = (text: string) => {
    const tags = text
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (tags.length > 0) {
      setCaptureTags((current) => [...new Set([...current, ...tags])]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setCaptureTags(captureTags.filter((t) => t !== tag));
  };

  return (
    <Container>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View className="px-sp-4 pb-sp-8">
          <View className="flex-row items-center justify-between mb-sp-4">
            <View>
              <Text className="font-bold text-foreground text-lg">Moments</Text>
              <Text className="text-muted-foreground text-sm">
                Capture and review key interactions, successes, and milestones
                with Reem.
              </Text>
            </View>
            <Button
              onPress={() => setShowCapture(true)}
              icon={<Plus className="w-sp-4 h-sp-4" />}
              size="sm"
            >
              Capture Moment
            </Button>
          </View>

          <Card className="overflow-hidden mb-sp-4">
            <View className="px-sp-4 py-sp-3 flex-row gap-sp-2">
              {["all", "success", "milestone", "interaction"].map((t) => {
                const isActive = typeFilter === t;
                const label =
                  t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1);
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTypeFilter(t as MomentType | "all")}
                    className={
                      "flex-row items-center gap-sp-1 px-sp-3 py-sp-1.5 rounded-lg border " +
                      (isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background dark:bg-background-dark text-muted-foreground dark:text-muted-foreground-dark")
                    }
                  >
                    <Badge
                      variant="outline"
                      className={
                        "text-[10px] " +
                        (isActive ? "text-primary" : "text-muted-foreground")
                      }
                    >
                      {label}
                    </Badge>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => setPinnedOnly(!pinnedOnly)}
                className={
                  "flex-row items-center gap-sp-1 px-sp-3 py-sp-1.5 rounded-lg border " +
                  (pinnedOnly
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border bg-background dark:bg-background-dark text-muted-foreground dark:text-muted-foreground-dark")
                }
              >
                <Heart
                  className={
                    "w-sp-4 h-sp-4 " +
                    (pinnedOnly ? "fill-red-500" : "text-muted-foreground")
                  }
                />
                <Badge
                  variant="outline"
                  className={
                    "text-[10px] " +
                    (pinnedOnly ? "text-destructive" : "text-muted-foreground")
                  }
                >
                  Pinned Only
                </Badge>
              </TouchableOpacity>
            </View>
          </Card>

          {loading ? (
            <View className="flex-1 items-center justify-center py-sp-10">
              <Text className="text-muted-foreground">Loading moments...</Text>
            </View>
          ) : filteredMoments.length === 0 ? (
            <Card className="p-sp-8 text-center">
              <Heart className="w-sp-12 h-sp-12 text-muted-foreground mx-auto mb-sp-4" />
              <Text className="text-sm text-muted-foreground">
                {typeFilter !== "all" || pinnedOnly
                  ? "No moments match your filters."
                  : "No moments yet. Capture key interactions to review them later."}
              </Text>
              {(typeFilter !== "all" || pinnedOnly) && (
                <Button
                  onPress={() => {
                    setTypeFilter("all");
                    setPinnedOnly(false);
                  }}
                  size="sm"
                  mt-sp-3
                >
                  Clear filters
                </Button>
              )}
            </Card>
          ) : (
            <FlatList
              data={filteredMoments}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </View>
      </ScrollView>

      {showCapture && (
        <View className="absolute inset-0 z-50 bg-black/50 flex-1 items-center justify-center p-sp-4">
          <Card className="w-full max-w-[400px] bg-background dark:bg-background-dark">
            <View className="px-sp-4 py-sp-4">
              <View className="flex-row items-center justify-between mb-sp-4">
                <Text className="font-bold text-foreground text-lg">
                  Capture Moment
                </Text>
                <TouchableOpacity onPress={() => setShowCapture(false)}>
                  <Text className="text-muted-foreground">Cancel</Text>
                </TouchableOpacity>
              </View>

              <Input
                placeholder="Moment title (e.g. 'First autonomous task completed')"
                value={captureTitle}
                onChangeText={setCaptureTitle}
                autoFocus
                className="mb-sp-3"
              />

              <TextInput
                placeholder="Description (optional)"
                value={captureDescription}
                onChangeText={setCaptureDescription}
                multiline
                numberOfLines={3}
                className="mb-sp-3"
              />

              <View className="mb-sp-3">
                <Text className="text-[10px] font-medium text-muted-foreground mb-sp-1">
                  Type
                </Text>
                <View className="flex-row gap-sp-2">
                  {["success", "milestone", "interaction"].map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setCaptureType(t as MomentType)}
                      className={
                        "px-sp-3 py-sp-1.5 rounded-lg border " +
                        (captureType === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background dark:bg-background-dark text-muted-foreground dark:text-muted-foreground-dark")
                      }
                    >
                      <Text className="text-xs capitalize">
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="mb-sp-3">
                <Text className="text-[10px] font-medium text-muted-foreground mb-sp-1">
                  Tags (comma-separated)
                </Text>
                <Input
                  placeholder="e.g. coding, writing, analysis"
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={() => addTag(tagInput)}
                  className="mb-sp-3"
                />
                {captureTags.length > 0 && (
                  <View className="flex-row flex-wrap gap-sp-1 mb-sp-1">
                    {captureTags.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => removeTag(tag)}
                        className={
                          "px-sp-2 py-sp-0.5 bg-secondary dark:bg-secondary-dark rounded text-[10px] text-foreground dark:text-foreground-dark"
                        }
                      >
                        {tag}
                        <Text className="ml-sp-1">✕</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View className="flex-row gap-sp-2">
                <Button
                  onPress={() => setShowCapture(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onPress={captureMoment}
                  disabled={capturing || !captureTitle.trim()}
                  className="flex-1"
                  loading={capturing}
                >
                  Capture
                </Button>
              </View>
            </View>
          </Card>
        </View>
      )}
    </Container>
  );
}

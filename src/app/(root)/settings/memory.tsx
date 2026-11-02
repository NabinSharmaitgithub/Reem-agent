import { useRouter } from "expo-router";
import { Activity, BarChart3, HardDrive, List } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/shared/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/hooks/use-config";
import { useTheme } from "@/hooks/use-theme";

type MemoryTab = "entries" | "events" | "analytics";

export default function MemorySettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { memoryEnabled, updateMemoryEnabled } = useConfig();
  const [activeTab, setActiveTab] = useState<MemoryTab>("entries");

  const tabs: { id: MemoryTab; label: string; icon: any }[] = [
    { id: "entries", label: "Entries", icon: List },
    { id: "events", label: "Events", icon: Activity },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <Container
      scroll
      contentClassName="gap-sp-4 py-sp-4"
      includeBottomTabInset={false}
    >
      <View className="flex-row items-center gap-sp-2">
        <Button
          onPress={() => router.dismissTo("/settings")}
          size="icon-xs"
          variant="ghost"
        >
          <HardDrive color={theme.text} size={16} />
        </Button>
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-xl font-semibold text-foreground dark:text-foreground-dark">
            Memory
          </Text>
          <Text className="font-sans text-xs text-muted-foreground dark:text-muted-foreground-dark">
            Persistent personal memory across conversations
          </Text>
        </View>
      </View>

      {/* Memory toggle */}
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
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: memoryEnabled }}
            className="w-sp-10 h-sp-5 rounded-full px-sp-2"
            style={{
              backgroundColor: memoryEnabled
                ? theme.backgroundElement
                : "rgba(0,0,0,0.12)",
            }}
            onPress={() => {
              updateMemoryEnabled(!memoryEnabled).catch(console.error);
            }}
          >
            {memoryEnabled && (
              <View className="w-sp-4 h-sp-4 bg-white rounded-full translate-x-[18px]" />
            )}
          </Pressable>
        </View>
      </Card>

      {/* Tab navigation */}
      <View className="flex-row gap-sp-1 mb-sp-4 border-b border-border dark:border-border-dark pb-sp-2">
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            className={`flex-row items-center gap-sp-1 px-sp-3 py-sp-2 rounded-lg ${
              activeTab === tab.id
                ? "bg-primary text-white"
                : "text-muted-foreground dark:text-muted-foreground-dark hover:bg-background dark:hover:bg-background-dark"
            }`}
          >
            <tab.icon className="w-sp-4 h-sp-4" />
            <Text className="text-xs font-medium">{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === "entries" && <MemoryEntriesCard />}
      {activeTab === "events" && <MemoryEventsCard />}
      {activeTab === "analytics" && <MemoryAnalyticsCard />}
    </Container>
  );
}

function MemoryEntriesCard() {
  return (
    <Card className="overflow-hidden">
      <View className="px-sp-4 py-sp-3 border-b border-border dark:border-border-dark">
        <View className="flex-row items-center justify-between">
          <Text className="font-medium text-foreground">Memory entries</Text>
          <Text className="text-xs text-muted-foreground">
            Persistent facts about you
          </Text>
        </View>
      </View>
      <View className="p-sp-4">
        <Text className="text-sm text-muted-foreground">
          Memory entries are managed automatically by Reem as you converse. Use
          the chat to ask Reem to remember or forget specific information.
        </Text>
      </View>
    </Card>
  );
}

function MemoryEventsCard() {
  return (
    <Card className="overflow-hidden">
      <View className="px-sp-4 py-sp-3 border-b border-border dark:border-border-dark">
        <View className="flex-row items-center justify-between">
          <Text className="font-medium text-foreground">Memory events</Text>
          <Text className="text-xs text-muted-foreground">
            History of memory changes
          </Text>
        </View>
      </View>
      <View className="p-sp-4">
        <Text className="text-sm text-muted-foreground">
          Event history will appear here as Reem creates, updates, or archives
          memory entries during conversations.
        </Text>
      </View>
    </Card>
  );
}

function MemoryAnalyticsCard() {
  return (
    <Card className="overflow-hidden">
      <View className="px-sp-4 py-sp-3 border-b border-border dark:border-border-dark">
        <View className="flex-row items-center justify-between">
          <Text className="font-medium text-foreground">Memory analytics</Text>
          <Text className="text-xs text-muted-foreground">
            Usage statistics and distribution
          </Text>
        </View>
      </View>
      <View className="p-sp-4">
        <Text className="text-sm text-muted-foreground">
          Analytics will appear here as you build up your memory over time.
        </Text>
      </View>
    </Card>
  );
}

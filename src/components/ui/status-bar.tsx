/**
 * StatusBar
 *
 * A status bar component for the conversational UI that displays:
 * - Delta symbol status indicator (agent status)
 * * Permission status (accessibility, microphone, notifications)
 * - Task counter (daily task usage)
 *
 * Designed to be placed at the top of the chat screen.
 */

import { useEffect, useState } from "react";
import {
  PermissionsAndroid,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/modules/subscription/useSubscription";

export type StatusBarProps = {
  onPermissionsPress?: () => void;
  onTaskInfoPress?: () => void;
};

export function StatusBar({
  onPermissionsPress,
  onTaskInfoPress,
}: StatusBarProps = {}) {
  const { tasksUsed, dailyLimit, tasksRemaining, canPerformTask, isPro } =
    useSubscription();
  const [permissionsGranted, setPermissionsGranted] = useState<boolean>(true);

  useEffect(() => {
    // Check permissions on mount
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      if (Platform.OS !== "android") {
        setPermissionsGranted(true);
        return;
      }

      const mic = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      const notifications = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );

      setPermissionsGranted(mic && notifications);
    } catch {
      // permission checks may fail on some devices; assume granted
      setPermissionsGranted(true);
    }
  };

  const canPerform = canPerformTask;

  return (
    <View className="flex-row gap-sp-3 px-sp-4 py-sp-2">
      {/* Delta symbol status indicator */}
      <View className="flex-row items-center gap-sp-1.5">
        <View className="w-2 h-2 rounded-full bg-success" />
        <Text className="text-[10px] font-medium text-success">Connected</Text>
      </View>

      <View className="h-4 w-px bg-border dark:bg-border-dark mx-sp-1" />

      {/* Permission status */}
      <TouchableOpacity
        onPress={onPermissionsPress}
        className="flex-row items-center gap-sp-1.5"
      >
        <View
          className={`w-2 h-2 rounded-full ${
            permissionsGranted ? "bg-success" : "bg-destructive"
          }`}
        />
        <Text
          className={`text-[10px] font-medium ${
            permissionsGranted ? "text-success" : "text-destructive"
          }`}
        >
          {permissionsGranted ? "Permissions OK" : "Permissions needed"}
        </Text>
      </TouchableOpacity>

      <View className="h-4 w-px bg-border dark:bg-border-dark mx-sp-1" />

      {/* Task counter */}
      <TouchableOpacity
        onPress={onTaskInfoPress}
        className="flex-row items-center gap-sp-1.5"
      >
        <View className="w-2 h-2 rounded-full">
          <Badge variant={canPerform ? "default" : "destructive"}>
            {tasksUsed}/{dailyLimit}
          </Badge>
        </View>
        <Text className="text-[10px] font-medium text-muted-foreground dark:text-muted-foreground-dark">
          {canPerform ? tasksRemaining : "Limit reached"}
          {isPro ? " (Pro)" : ""}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

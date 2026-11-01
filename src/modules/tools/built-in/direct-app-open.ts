import { tool } from "ai";
import { z } from "zod";

import type { ToolExecutionRecord } from "@/core/types/app-state";
import { createRecord } from "@/modules/tools/built-in/shared";

import * as Linking from "expo-linking";
import { Platform } from "react-native";

/**
 * Direct app opening tool (DEBUG ONLY).
 *
 * Opens an app directly by its package name on Android. Requires
 * QUERY_ALL_PACKAGES permission. Disabled for Play Store releases via
 * the ENABLE_DIRECT_APP_OPENING flag in app.json / build config.
 */
export function createDirectAppOpenTools(input: {
  onRecord?: (record: ToolExecutionRecord) => void;
  isDebugBuild: boolean;
}) {
  const { onRecord, isDebugBuild } = input;

  const handleRecord = (record: ToolExecutionRecord) => {
    onRecord?.(record);
  };

  return {
    tools: {
      app_open: tool({
        description:
          "DEBUG ONLY: Open another app on the device by its package name (e.g. com.whatsapp, com.android.chrome). Only works on Android debug builds. Requires QUERY_ALL_PACKAGES permission.",
        inputSchema: z.object({
          packageName: z
            .string()
            .describe("The Android package name of the app to open."),
        }),
        execute: async ({ packageName }) => {
          if (Platform.OS !== "android") {
            return { ok: false, error: "Direct app opening is Android-only." };
          }
          if (!isDebugBuild) {
            return {
              ok: false,
              error: "Direct app opening is disabled for release builds.",
            };
          }

          try {
            handleRecord(
              createRecord({
                toolName: "app_open",
                status: "completed",
                inputSummary: `Open app: ${packageName}`,
              }),
            );

            // Try to open via the app's main activity
            const opened = await Linking.openURL(
              `intent:#Intent;package=${packageName};end`,
            );

            return {
              ok: opened,
              opened,
              packageName,
              message: opened
                ? `Opened ${packageName}`
                : `Could not open ${packageName}. Try the full intent URL.`,
            };
          } catch (error) {
            handleRecord(
              createRecord({
                toolName: "app_open",
                status: "failed",
                inputSummary: `Open app: ${packageName}`,
                error: error instanceof Error ? error.message : String(error),
              }),
            );
            return {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },
      }),

      app_list: tool({
        description:
          "DEBUG ONLY: Get a list of installed app package names on the device. Requires QUERY_ALL_PACKAGES permission.",
        inputSchema: z.object({}),
        execute: async () => {
          if (Platform.OS !== "android") {
            return { ok: false, error: "App listing is Android-only." };
          }
          if (!isDebugBuild) {
            return {
              ok: false,
              error: "App listing is disabled for release builds.",
            };
          }

          // Installed app listing is not available yet; callers can still open
          // a known package directly with app_open.
          return {
            ok: true,
            apps: [],
            message:
              "App listing requires native package manager query. Use app_open with a known package name.",
          };
        },
      }),
    },
  };
}

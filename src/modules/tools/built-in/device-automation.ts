import { tool } from "ai";
import { z } from "zod";

import type { ToolExecutionRecord } from "@/core/types/app-state";
import { createRecord } from "@/modules/tools/built-in/shared";

import { DeviceAutomationModule } from "@/modules/native/device-automation";

/**
 * Built-in tools that let the agent control the device through the Android
 * Accessibility Service:
 *
 * - deviceReadScreen → capture the UI hierarchy of the foreground app
 * - deviceTap → tap at screen coordinates
 * - deviceLongPress → long-press at screen coordinates
 * - deviceSwipe → swipe from one point to another
 * - deviceScroll → scroll at a point in a direction
 * - deviceType → enter text into the currently focused field
 * - deviceGlobalAction → back / home / recents / notification_shade
 * - deviceScreenshot → capture a screenshot
 * - deviceForegroundApp → identify the currently active app
 * - deviceAccessibilityStatus → check if the service is enabled
 * - deviceOpenAccessibilitySettings → open system accessibility settings
 *
 * These are only available on Android and only after the user enables the
 * Reem Accessibility Service in Settings → Accessibility → Reem.
 */
export function createDeviceAutomationTools(input: {
  onRecord?: (record: ToolExecutionRecord) => void;
}) {
  const { onRecord } = input;
  const deviceAutomation = DeviceAutomationModule;
  if (!deviceAutomation) {
    throw new Error("Device automation is unavailable on this platform.");
  }

  const handleRecord = (record: ToolExecutionRecord) => {
    onRecord?.(record);
  };

  return {
    tools: {
      deviceReadScreen: tool({
        description:
          "Read the current screen: captures the UI element hierarchy of the foreground app as JSON (classes, text, content descriptions, resource IDs, bounds, clickable/focused/enabled states, children). Call this first to understand what's on screen before tapping or typing. Returns the raw JSON plus the package and activity name.",
        inputSchema: z.object({
          maxDepth: z
            .number()
            .int()
            .min(1)
            .max(20)
            .optional()
            .default(10)
            .describe("Maximum nesting depth of the UI tree to capture."),
        }),
        execute: async ({ maxDepth }) => {
          try {
            const json = await deviceAutomation.captureHierarchy(maxDepth);
            handleRecord(
              createRecord({
                toolName: "deviceReadScreen",
                status: "completed",
                inputSummary: `Read screen (maxDepth=${maxDepth})`,
              }),
            );
            return {
              ok: true,
              hierarchy: json,
              note: "Inspect the hierarchy for clickable/focusable elements (buttons, links, text fields). Use their bounds to tap, or their resourceId/contentDesc to identify them.",
            };
          } catch (error) {
            handleRecord(
              createRecord({
                toolName: "deviceReadScreen",
                status: "failed",
                inputSummary: "Read screen",
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

      deviceTap: tool({
        description:
          "Tap a single point on the screen. Coordinates are in pixels (0..screenWidth, 0..screenHeight). Use deviceReadScreen first to find element bounds, then tap the center of the target's bounds.",
        inputSchema: z.object({
          x: z.number().describe("X coordinate in pixels."),
          y: z.number().describe("Y coordinate in pixels."),
        }),
        execute: async ({ x, y }) => {
          try {
            await deviceAutomation.performTap(x, y);
            handleRecord(
              createRecord({
                toolName: "deviceTap",
                status: "completed",
                inputSummary: `Tap at (${x}, ${y})`,
              }),
            );
            return { ok: true, tapped: { x, y } };
          } catch (error) {
            handleRecord(
              createRecord({
                toolName: "deviceTap",
                status: "failed",
                inputSummary: `Tap at (${x}, ${y})`,
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

      deviceLongPress: tool({
        description:
          "Long-press a point on the screen. Coordinates are in pixels. durationMs defaults to 500.",
        inputSchema: z.object({
          x: z.number().describe("X coordinate in pixels."),
          y: z.number().describe("Y coordinate in pixels."),
          durationMs: z
            .number()
            .int()
            .min(100)
            .max(5000)
            .optional()
            .default(500)
            .describe("Press duration in milliseconds."),
        }),
        execute: async ({ x, y, durationMs }) => {
          try {
            await deviceAutomation.performLongPress(x, y, durationMs);
            handleRecord(
              createRecord({
                toolName: "deviceLongPress",
                status: "completed",
                inputSummary: `Long-press at (${x}, ${y}) for ${durationMs}ms`,
              }),
            );
            return { ok: true, longPressed: { x, y, durationMs } };
          } catch (error) {
            handleRecord(
              createRecord({
                toolName: "deviceLongPress",
                status: "failed",
                inputSummary: `Long-press at (${x}, ${y})`,
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

      deviceSwipe: tool({
        description:
          "Swipe from one point to another on the screen. Coordinates are in pixels. durationMs defaults to 500.",
        inputSchema: z.object({
          x1: z.number().describe("Start X coordinate in pixels."),
          y1: z.number().describe("Start Y coordinate in pixels."),
          x2: z.number().describe("End X coordinate in pixels."),
          y2: z.number().describe("End Y coordinate in pixels."),
          durationMs: z
            .number()
            .int()
            .min(100)
            .max(5000)
            .optional()
            .default(500)
            .describe("Swipe duration in milliseconds."),
        }),
        execute: async ({ x1, y1, x2, y2, durationMs }) => {
          try {
            await deviceAutomation.performSwipe(x1, y1, x2, y2, durationMs);
            handleRecord(
              createRecord({
                toolName: "deviceSwipe",
                status: "completed",
                inputSummary: `Swipe from (${x1}, ${y1}) to (${x2}, ${y2})`,
              }),
            );
            return {
              ok: true,
              swiped: { from: { x1, y1 }, to: { x2, y2 }, durationMs },
            };
          } catch (error) {
            handleRecord(
              createRecord({
                toolName: "deviceSwipe",
                status: "failed",
                inputSummary: `Swipe from (${x1}, ${y1}) to (${x2}, ${y2})`,
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

      deviceScroll: tool({
        description:
          "Scroll at a point on the screen in a direction (up/down/left/right). distance controls scroll intensity (50-2000, default 300).",
        inputSchema: z.object({
          x: z.number().describe("X coordinate in pixels."),
          y: z.number().describe("Y coordinate in pixels."),
          direction: z
            .enum(["up", "down", "left", "right"])
            .describe("Scroll direction."),
          distance: z
            .number()
            .int()
            .min(50)
            .max(2000)
            .optional()
            .default(300)
            .describe("Scroll intensity."),
        }),
        execute: async ({ x, y, direction, distance }) => {
          try {
            await deviceAutomation.performScroll(x, y, direction, distance);
            handleRecord(
              createRecord({
                toolName: "deviceScroll",
                status: "completed",
                inputSummary: `Scroll ${direction} at (${x}, ${y})`,
              }),
            );
            return { ok: true, scrolled: { x, y, direction, distance } };
          } catch (error) {
            handleRecord(
              createRecord({
                toolName: "deviceScroll",
                status: "failed",
                inputSummary: `Scroll ${direction} at (${x}, ${y})`,
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

      deviceType: tool({
        description:
          "Enter text into the currently focused input field. The field must have focus (tap it first with deviceTap if needed).",
        inputSchema: z.object({
          text: z.string().describe("Text to type into the focused field."),
        }),
        execute: async ({ text }) => {
          try {
            await deviceAutomation.enterText(text);
            handleRecord(
              createRecord({
                toolName: "deviceType",
                status: "completed",
                inputSummary: `Type text (${text.length} chars)`,
              }),
            );
            return { ok: true, typed: text };
          } catch (error) {
            handleRecord(
              createRecord({
                toolName: "deviceType",
                status: "failed",
                inputSummary: "Type text",
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

      deviceGlobalAction: tool({
        description:
          "Perform a global system action: back, home, recents (recent apps), notification_shade, or power_dialog.",
        inputSchema: z.object({
          action: z
            .enum([
              "back",
              "home",
              "recents",
              "notification_shade",
              "power_dialog",
            ])
            .describe("Global action to perform."),
        }),
        execute: async ({ action }) => {
          try {
            await deviceAutomation.performGlobalAction(action);
            handleRecord(
              createRecord({
                toolName: "deviceGlobalAction",
                status: "completed",
                inputSummary: `Global action: ${action}`,
              }),
            );
            return { ok: true, action };
          } catch (error) {
            handleRecord(
              createRecord({
                toolName: "deviceGlobalAction",
                status: "failed",
                inputSummary: `Global action: ${action}`,
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

      deviceScreenshot: tool({
        description:
          "Attempt to capture a screenshot of the current screen. Returns a file path if successful; otherwise explains why (bitmap capture requires MediaProjection user consent, which isn't available yet). Falls back to capturing the UI hierarchy.",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const result = await deviceAutomation.takeScreenshot();
            handleRecord(
              createRecord({
                toolName: "deviceScreenshot",
                status: result.captured ? "completed" : "failed",
                inputSummary: "Take screenshot",
                error: result.captured ? undefined : result.error,
              }),
            );
            return result;
          } catch (error) {
            handleRecord(
              createRecord({
                toolName: "deviceScreenshot",
                status: "failed",
                inputSummary: "Take screenshot",
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

      deviceForegroundApp: tool({
        description:
          "Identify the currently active app (package name, activity, accessibility status). Use this to know which app is in the foreground before acting.",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const result = await deviceAutomation.getForegroundApp();
            handleRecord(
              createRecord({
                toolName: "deviceForegroundApp",
                status: "completed",
                inputSummary: "Get foreground app",
              }),
            );
            return result;
          } catch (error) {
            return {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },
      }),

      deviceAccessibilityStatus: tool({
        description:
          "Check whether the Reem Accessibility Service is enabled and connected. Returns true/false. If false, the user must enable it in Settings → Accessibility → Reem before device control tools work.",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const enabled = await deviceAutomation.isAccessibilityEnabled();
            const connected =
              await deviceAutomation.isAccessibilityServiceConnected();
            handleRecord(
              createRecord({
                toolName: "deviceAccessibilityStatus",
                status: "completed",
                inputSummary: "Check accessibility status",
              }),
            );
            return {
              ok: true,
              accessibilityEnabled: enabled,
              serviceConnected: connected,
              hint: connected
                ? "Accessibility service is active. Device control tools are available."
                : "Enable the Reem Accessibility Service in Settings → Accessibility → Reem to control the device.",
            };
          } catch (error) {
            return {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },
      }),

      deviceOpenAccessibilitySettings: tool({
        description:
          "Open the Android Accessibility settings screen so the user can enable the Reem Accessibility Service.",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            await deviceAutomation.openAccessibilitySettings();
            handleRecord(
              createRecord({
                toolName: "deviceOpenAccessibilitySettings",
                status: "completed",
                inputSummary: "Open accessibility settings",
              }),
            );
            return {
              ok: true,
              message:
                "Opened Accessibility settings. Enable the Reem Accessibility Service, then return here and retry device control.",
            };
          } catch (error) {
            return {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },
      }),
    },
  };
}

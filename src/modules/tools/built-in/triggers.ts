import { tool } from "ai";
import { z } from "zod";

import type { ToolExecutionRecord } from "@/core/types/app-state";
import { createRecord } from "@/modules/tools/built-in/shared";
import { TriggerRepository } from "@/modules/triggers/trigger-repository";

export function createTriggerTools(input: {
  onRecord?: (record: ToolExecutionRecord) => void;
  repository: TriggerRepository;
}) {
  const { onRecord, repository } = input;

  const handleRecord = (record: ToolExecutionRecord) => {
    onRecord?.(record);
  };

  return {
    tools: {
      trigger_create: tool({
        description:
          "Create a new automation trigger. Triggers can fire on a schedule (cron) or when a specific app posts a notification. The trigger runs an agent task with the given prompt when activated.",
        inputSchema: z.object({
          title: z.string().describe("Human-readable name for the trigger."),
          description: z
            .string()
            .optional()
            .describe("Optional description of what the trigger does."),
          type: z
            .enum(["scheduled", "notification"])
            .describe(
              "Trigger type: 'scheduled' runs on a cron schedule, 'notification' runs when an app posts a notification.",
            ),
          prompt: z
            .string()
            .describe("The agent prompt to execute when triggered."),
          providerId: z
            .string()
            .describe("LLM provider ID to use for the triggered run."),
          modelId: z
            .string()
            .describe("Model ID to use for the triggered run."),
          agentId: z
            .string()
            .optional()
            .describe("Optional agent ID to use for the triggered run."),
          autoApprove: z
            .boolean()
            .optional()
            .default(true)
            .describe("Whether the triggered run auto-approves tool calls."),
          enabled: z
            .boolean()
            .optional()
            .default(true)
            .describe("Whether the trigger is initially enabled."),
          cronExpression: z
            .string()
            .optional()
            .describe(
              "Cron expression for scheduled triggers (e.g. '0 9 * * 1-5').",
            ),
          timezone: z
            .string()
            .optional()
            .describe(
              "Timezone for scheduled triggers (e.g. 'America/New_York').",
            ),
          weekdays: z
            .array(z.string())
            .optional()
            .describe(
              "Weekdays for scheduled triggers (e.g. ['Monday','Wednesday']).",
            ),
          time: z
            .string()
            .optional()
            .describe("Time for scheduled triggers (HH:MM format)."),
          notificationAppPackage: z
            .string()
            .optional()
            .describe("App package name for notification triggers."),
          notificationAppName: z
            .string()
            .optional()
            .describe("Human-readable app name for notification triggers."),
        }),
        execute: async (input) => {
          try {
            const trigger = await repository.createTrigger(input);
            handleRecord(
              createRecord({
                toolName: "trigger_create",
                status: "completed",
                inputSummary: `Create trigger: ${input.title}`,
              }),
            );
            return {
              ok: true,
              trigger: {
                id: trigger.id,
                title: trigger.title,
                type: trigger.type,
                enabled: trigger.enabled,
              },
            };
          } catch (error) {
            handleRecord(
              createRecord({
                toolName: "trigger_create",
                status: "failed",
                inputSummary: `Create trigger: ${input.title}`,
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

      trigger_list: tool({
        description:
          "List all existing triggers with their status, type, and trigger count.",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const triggers = await repository.getTriggers();
            handleRecord(
              createRecord({
                toolName: "trigger_list",
                status: "completed",
                inputSummary: "List triggers",
              }),
            );
            return {
              ok: true,
              triggers: triggers.map((t) => ({
                id: t.id,
                title: t.title,
                type: t.type,
                enabled: t.enabled,
                triggerCount: t.triggerCount,
                lastTriggeredAt: t.lastTriggeredAt,
              })),
            };
          } catch (error) {
            return {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },
      }),

      trigger_enable: tool({
        description: "Enable or disable an existing trigger by ID.",
        inputSchema: z.object({
          id: z.string().describe("The trigger ID."),
          enabled: z
            .boolean()
            .describe("Whether to enable or disable the trigger."),
        }),
        execute: async ({ id, enabled }) => {
          try {
            await repository.setTriggerEnabled(id, enabled);
            handleRecord(
              createRecord({
                toolName: "trigger_enable",
                status: "completed",
                inputSummary: `${enabled ? "Enable" : "Disable"} trigger: ${id}`,
              }),
            );
            return { ok: true, id, enabled };
          } catch (error) {
            return {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },
      }),

      trigger_delete: tool({
        description: "Delete a trigger by ID.",
        inputSchema: z.object({
          id: z.string().describe("The trigger ID to delete."),
        }),
        execute: async ({ id }) => {
          try {
            await repository.deleteTrigger(id);
            handleRecord(
              createRecord({
                toolName: "trigger_delete",
                status: "completed",
                inputSummary: `Delete trigger: ${id}`,
              }),
            );
            return { ok: true, id };
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

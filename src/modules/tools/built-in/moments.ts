/**
 * Moments tools
 *
 * Provides the LLM with tools to capture key moments from agent runs:
 * captureMoment creates a durable record of important interactions,
 * successes, and milestones that users want to remember and review later.
 */

import { tool, type ToolSet } from "ai";
import { z } from "zod";

import type { ToolExecutionRecord } from "@/core/types/app-state";
import { MomentsRepository } from "@/modules/moments/moments-repository";
import { createRecord } from "@/modules/tools/built-in/shared";

export function createMomentsTools(input: {
  onRecord?: (record: ToolExecutionRecord) => void;
  repository: MomentsRepository;
}) {
  const { onRecord, repository } = input;

  const handleRecord = (record: ToolExecutionRecord) => {
    onRecord?.(record);
  };

  return {
    tools: {
      captureMoment: tool({
        description:
          "Capture a key moment from the current interaction. Use this when something important happens: a task completes successfully, a user reaches a milestone, an important insight emerges, or any interaction worth remembering later. Moments are stored persistently and can be reviewed in the Moments screen.",
        inputSchema: z.object({
          title: z
            .string()
            .trim()
            .min(1)
            .max(100)
            .describe(
              "A concise title for the moment (e.g. 'Autonomous web research completed').",
            ),
          description: z
            .string()
            .trim()
            .max(500)
            .optional()
            .describe(
              "Optional description providing more context about what happened and why it matters.",
            ),
          type: z
            .enum(["success", "milestone", "interaction"])
            .optional()
            .default("interaction")
            .describe(
              "Type of moment: success (task completed well), milestone (significant progress/achievement), interaction (notable user interaction).",
            ),
          tags: z
            .array(z.string().trim().min(1).max(30))
            .optional()
            .default([])
            .describe(
              "Optional tags for categorization (e.g. ['coding', 'research', 'planning']).",
            ),
        }),
        execute: async ({ title, description, type, tags }) => {
          try {
            const moment = await repository.createMoment({
              title,
              description,
              type,
              tags,
            });

            handleRecord(
              createRecord({
                toolName: "captureMoment",
                status: "completed",
                inputSummary: `Capture moment: ${title}`,
              }),
            );

            return {
              momentId: moment.id,
              status: "created",
              title: moment.title,
              type: moment.type,
              message: `Moment captured: "${title}".`,
            };
          } catch (error) {
            handleRecord(
              createRecord({
                toolName: "captureMoment",
                status: "failed",
                inputSummary: `Capture moment: ${title}`,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to capture moment.",
              }),
            );
            return {
              status: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to capture moment.",
            };
          }
        },
      }),
    } satisfies ToolSet,
  };
}

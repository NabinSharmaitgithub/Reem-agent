/**
 * Enhanced Memory Tools
 *
 * Provides the LLM with tools to manage multiple memory entries:
 * writeMemory, updateMemoryEntry, deleteMemoryEntry, searchMemory,
 * listMemories, forgetMemoryEntry
 */

import { tool, type ToolSet } from "ai";
import { z } from "zod";

import type { MemoryRepository } from "@/modules/memory/memory-repository";
import type { MemoryEntryEnhanced } from "./types";

const MAX_MEMORY_CONTENT_LENGTH = 5_000;

export function createEnhancedMemoryTools(input: {
  repository: MemoryRepository;
  onEntryChange?: (entry: MemoryEntryEnhanced) => void;
}) {
  const { repository, onEntryChange } = input;

  const handleEntryChange = (entry: MemoryEntryEnhanced) => {
    onEntryChange?.(entry);
  };

  return {
    tools: {
      writeMemory: tool({
        description:
          "Create a new durable memory entry. Use this to save important facts about the user, their preferences, constraints, goals, or any information that should persist across conversations. Each entry should be a single declarative fact.",
        inputSchema: z.object({
          content: z
            .string()
            .trim()
            .min(1)
            .max(MAX_MEMORY_CONTENT_LENGTH)
            .describe(
              "The memory content as a declarative fact (e.g. 'User prefers concise responses').",
            ),
          category: z
            .enum([
              "personal",
              "preference",
              "constraint",
              "fact",
              "goal",
              "context",
            ])
            .optional()
            .default("fact")
            .describe(
              "Category of the memory: personal (about the user), preference (likes/dislikes), constraint (limitations), fact (verifiable information), goal (objectives), context (situational information).",
            ),
          importance: z
            .enum(["low", "medium", "high", "critical"])
            .optional()
            .default("medium")
            .describe(
              "Importance level: low (nice to know), medium (useful context), high (important for decisions), critical (essential to remember).",
            ),
          tags: z
            .array(z.string().trim().min(1).max(30))
            .optional()
            .default([])
            .describe(
              "Optional tags for categorization and search (e.g. ['work', 'travel', 'diet']).",
            ),
        }),
        execute: async ({ content, category, importance, tags }) => {
          try {
            const entry = await repository.createEntry({
              content,
              category,
              importance,
              tags,
            });

            handleEntryChange(entry);

            return {
              memoryId: entry.id,
              status: "created",
              category: entry.category,
              importance: entry.importance,
              message: `Memory entry created (${entry.category}, ${entry.importance}).`,
            };
          } catch (error) {
            return {
              status: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to create memory entry.",
            };
          }
        },
      }),

      updateMemoryEntry: tool({
        description:
          "Update an existing memory entry by ID. Use this to correct, refine, or expand a previously saved memory. Only fields provided will be updated.",
        inputSchema: z.object({
          id: z.string().describe("The ID of the memory entry to update."),
          content: z
            .string()
            .trim()
            .min(1)
            .max(MAX_MEMORY_CONTENT_LENGTH)
            .optional()
            .describe("Revised memory content."),
          category: z
            .enum([
              "personal",
              "preference",
              "constraint",
              "fact",
              "goal",
              "context",
            ])
            .optional()
            .describe("Revised category."),
          importance: z
            .enum(["low", "medium", "high", "critical"])
            .optional()
            .describe("Revised importance level."),
          tags: z
            .array(z.string().trim().min(1).max(30))
            .optional()
            .describe("Revised tags."),
          enabled: z
            .boolean()
            .optional()
            .describe(
              "Whether the memory is active (true) or disabled (false).",
            ),
        }),
        execute: async ({ id, ...updates }) => {
          try {
            const entry = await repository.updateEntry({
              id,
              ...updates,
            });

            handleEntryChange(entry);

            return {
              memoryId: entry.id,
              status: "updated",
              category: entry.category,
              importance: entry.importance,
              message: `Memory entry updated.`,
            };
          } catch (error) {
            return {
              status: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to update memory entry.",
            };
          }
        },
      }),

      deleteMemoryEntry: tool({
        description:
          "Delete a specific memory entry by ID. Use this when the user explicitly asks to forget a specific fact or memory. This removes the entry permanently.",
        inputSchema: z.object({
          id: z.string().describe("The ID of the memory entry to delete."),
        }),
        execute: async ({ id }) => {
          try {
            await repository.deleteEntry(id);
            handleEntryChange({
              id,
              content: "",
              enabled: false,
              category: "fact",
              importance: "medium",
              tags: [],
              sourceConversationId: null,
              sourceMessageId: null,
              createdAt: "",
              updatedAt: "",
              archivedAt: null,
              accessCount: 0,
              lastAccessedAt: null,
            } as MemoryEntryEnhanced);

            return {
              memoryId: id,
              status: "deleted",
              message: `Memory entry deleted.`,
            };
          } catch (error) {
            return {
              status: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to delete memory entry.",
            };
          }
        },
      }),

      searchMemory: tool({
        description:
          "Search existing memory entries by keyword. Returns entries ranked by relevance, useful for recalling relevant information before acting.",
        inputSchema: z.object({
          query: z
            .string()
            .trim()
            .min(1)
            .describe("Keywords or phrase to search for in memory entries."),
          category: z
            .enum([
              "personal",
              "preference",
              "constraint",
              "fact",
              "goal",
              "context",
            ])
            .optional()
            .describe("Filter by category."),
          importance: z
            .enum(["low", "medium", "high", "critical"])
            .optional()
            .describe("Filter by importance level."),
          limit: z
            .number()
            .int()
            .min(1)
            .max(50)
            .optional()
            .default(10)
            .describe("Maximum number of results to return."),
        }),
        execute: async ({ query, category, importance, limit }) => {
          try {
            const results = await repository.searchEntries(query, {
              category,
              importance,
              enabledOnly: true,
              limit,
            });

            return {
              status: "success",
              query,
              results: results.map((r) => ({
                memoryId: r.entry.id,
                content: r.entry.content,
                category: r.entry.category,
                importance: r.entry.importance,
                tags: r.entry.tags,
                score: r.score,
                matchedFields: r.matchedFields,
                updatedAt: r.entry.updatedAt,
              })),
              count: results.length,
            };
          } catch (error) {
            return {
              status: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to search memory.",
            };
          }
        },
      }),

      listMemories: tool({
        description:
          "List all active memory entries, optionally filtered by category or importance. Use this to review what the system remembers about the user.",
        inputSchema: z.object({
          category: z
            .enum([
              "personal",
              "preference",
              "constraint",
              "fact",
              "goal",
              "context",
            ])
            .optional()
            .describe("Filter by category."),
          importance: z
            .enum(["low", "medium", "high", "critical"])
            .optional()
            .describe("Filter by importance level."),
          enabledOnly: z
            .boolean()
            .optional()
            .default(true)
            .describe("Only return enabled entries."),
        }),
        execute: async ({ category, importance, enabledOnly }) => {
          try {
            let entries = await repository.getEntries(enabledOnly);

            if (category) {
              entries = entries.filter((e) => e.category === category);
            }

            if (importance) {
              entries = entries.filter((e) => e.importance === importance);
            }

            return {
              status: "success",
              memories: entries.map((e) => ({
                memoryId: e.id,
                content: e.content,
                category: e.category,
                importance: e.importance,
                tags: e.tags,
                enabled: e.enabled,
                archivedAt: e.archivedAt,
                accessCount: e.accessCount,
                updatedAt: e.updatedAt,
                createdAt: e.createdAt,
              })),
              count: entries.length,
            };
          } catch (error) {
            return {
              status: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to list memories.",
            };
          }
        },
      }),

      forgetMemoryEntry: tool({
        description:
          "Delete a specific memory entry by ID. Use this when the user asks to forget a specific fact. This is more targeted than clearing all memory.",
        inputSchema: z.object({
          id: z.string().describe("The ID of the memory entry to forget."),
          reason: z
            .string()
            .optional()
            .describe("Optional reason for forgetting this memory."),
        }),
        execute: async ({ id, reason }) => {
          try {
            await repository.deleteEntry(id);
            handleEntryChange({
              id,
              content: "",
              enabled: false,
              category: "fact",
              importance: "medium",
              tags: [],
              sourceConversationId: null,
              sourceMessageId: null,
              createdAt: "",
              updatedAt: "",
              archivedAt: null,
              accessCount: 0,
              lastAccessedAt: null,
            } as MemoryEntryEnhanced);

            return {
              memoryId: id,
              status: "forgotten",
              reason: reason ?? null,
              message: `Memory entry forgotten.${reason ? ` Reason: ${reason}` : ""}`,
            };
          } catch (error) {
            return {
              status: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to forget memory entry.",
            };
          }
        },
      }),

      archiveMemoryEntry: tool({
        description:
          "Archive a memory entry without deleting it. Archived entries are hidden from normal use but can be restored later.",
        inputSchema: z.object({
          id: z.string().describe("The ID of the memory entry to archive."),
        }),
        execute: async ({ id }) => {
          try {
            await repository.archiveEntry(id);
            handleEntryChange({
              id,
              content: "",
              enabled: false,
              category: "fact",
              importance: "medium",
              tags: [],
              sourceConversationId: null,
              sourceMessageId: null,
              createdAt: "",
              updatedAt: "",
              archivedAt: new Date().toISOString(),
              accessCount: 0,
              lastAccessedAt: null,
            } as MemoryEntryEnhanced);

            return {
              memoryId: id,
              status: "archived",
              message: `Memory entry archived.`,
            };
          } catch (error) {
            return {
              status: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to archive memory entry.",
            };
          }
        },
      }),

      getMemoryStats: tool({
        description:
          "Get statistics about the memory system: total entries, category distribution, importance levels, and access patterns.",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const stats = await repository.getStats();
            return {
              status: "success",
              stats,
            };
          } catch (error) {
            return {
              status: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to get memory stats.",
            };
          }
        },
      }),
    } satisfies ToolSet,
  };
}

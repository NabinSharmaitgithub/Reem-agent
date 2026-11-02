/**
 * Enhanced Memory System Types
 *
 * Extends the existing MemoryEntry with categories, importance levels,
 * tags, and search capabilities for a personalized, persistent memory
 * system that learns from interactions.
 */

import type { MemoryEntry, MemoryEvent } from "@/core/types/app-state";

export type MemoryStore = {
  read(): Promise<MemoryEntry | null>;
  write(content: string): Promise<MemoryEntry>;
  clear(): Promise<void>;
};

export type MemoryCategory =
  "personal" | "preference" | "constraint" | "fact" | "goal" | "context";

export type MemoryImportance = "low" | "medium" | "high" | "critical";

export type MemoryEntryEnhanced = MemoryEntry & {
  category: MemoryCategory;
  importance: MemoryImportance;
  tags: string[];
  accessCount: number;
  lastAccessedAt: string | null;
};

export type CreateMemoryEntryInput = {
  content: string;
  category?: MemoryCategory;
  importance?: MemoryImportance;
  tags?: string[];
  sourceConversationId?: string | null;
  sourceMessageId?: string | null;
};

export type UpdateMemoryEntryInput = {
  id: string;
  content?: string;
  category?: MemoryCategory;
  importance?: MemoryImportance;
  tags?: string[];
  enabled?: boolean;
  archivedAt?: string | null;
};

export type MemorySearchResult = {
  entry: MemoryEntryEnhanced;
  score: number;
  matchedFields: string[];
};

export type MemoryInsight = {
  type: "fact" | "preference" | "constraint" | "goal" | "context";
  content: string;
  confidence: number;
  suggestedCategory: MemoryCategory;
  suggestedImportance: MemoryImportance;
  sourceMessageId: string;
};

export type MemoryStats = {
  totalEntries: number;
  enabledEntries: number;
  archivedEntries: number;
  byCategory: Record<MemoryCategory, number>;
  byImportance: Record<MemoryImportance, number>;
  totalAccessCount: number;
  lastUpdatedAt: string | null;
};

export type MemoryEventEnhanced = MemoryEvent & {
  category?: MemoryCategory;
  oldCategory?: MemoryCategory;
  oldImportance?: MemoryImportance;
  newImportance?: MemoryImportance;
};

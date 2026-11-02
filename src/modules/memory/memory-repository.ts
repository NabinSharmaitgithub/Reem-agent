/**
 * MemoryRepository - DB-backed storage for multiple memory entries.
 *
 * Provides CRUD operations, full-text search, and analytics for the
 * enhanced memory system. Works alongside the existing file-based
 * memory store for backward compatibility.
 */

import type { AppDatabase } from "@/core/db/database";
import { memories } from "@/core/db/schema";
import { desc, eq, ilike, and, sql } from "drizzle-orm";

import type {
  CreateMemoryEntryInput,
  MemoryEntryEnhanced,
  MemoryImportance,
  MemoryCategory,
  MemorySearchResult,
  MemoryStats,
  UpdateMemoryEntryInput,
} from "./types";

export class MemoryRepository {
  constructor(private db: AppDatabase) {}

  // ── CRUD ────────────────────────────────────────────────────────

  async createEntry(input: CreateMemoryEntryInput): Promise<MemoryEntryEnhanced> {
    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    const [entry] = await this.db
      .insert(memories)
      .values({
        id,
        content: input.content,
        enabled: true,
        sourceConversationId: input.sourceConversationId ?? null,
        sourceMessageId: input.sourceMessageId ?? null,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        category: input.category ?? "fact",
        importance: input.importance ?? "medium",
        tagsJson: JSON.stringify(input.tags ?? []),
        accessCount: 0,
        lastAccessedAt: null,
      })
      .returning();

    return this.mapToEnhanced(entry);
  }

  async getEntry(id: string): Promise<MemoryEntryEnhanced | null> {
    const [entry] = await this.db
      .select()
      .from(memories)
      .where(eq(memories.id, id));

    if (!entry) return null;

    // Increment access count
    await this.db
      .update(memories)
      .set({
        updatedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        accessCount: sql`${memories.accessCount} + 1`,
      })
      .where(eq(memories.id, id));

    return this.mapToEnhanced(entry);
  }

  async getEntries(enabledOnly: boolean = false): Promise<MemoryEntryEnhanced[]> {
    const rows = enabledOnly
      ? await this.db.select().from(memories).where(eq(memories.enabled, true)).orderBy(desc(memories.updatedAt))
      : await this.db.select().from(memories).orderBy(desc(memories.updatedAt));
    return rows.map((row) => this.mapToEnhanced(row));
  }

  async updateEntry(input: UpdateMemoryEntryInput): Promise<MemoryEntryEnhanced> {
    const { id, ...updates } = input;
    const now = new Date().toISOString();

    const [entry] = await this.db
      .update(memories)
      .set({
        ...(updates.content !== undefined && { content: updates.content }),
        ...(updates.enabled !== undefined && { enabled: updates.enabled }),
        ...(updates.archivedAt !== undefined && { archivedAt: updates.archivedAt }),
        updatedAt: now,
      })
      .where(eq(memories.id, id))
      .returning();

    return this.mapToEnhanced(entry);
  }

  async deleteEntry(id: string): Promise<void> {
    await this.db.delete(memories).where(eq(memories.id, id));
  }

  async archiveEntry(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .update(memories)
      .set({ archivedAt: now, enabled: false, updatedAt: now })
      .where(eq(memories.id, id));
  }

  async restoreEntry(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .update(memories)
      .set({ archivedAt: null, enabled: true, updatedAt: now })
      .where(eq(memories.id, id));
  }

  // ── Search ──────────────────────────────────────────────────────

  async searchEntries(
    query: string,
    options: {
      category?: MemoryCategory;
      importance?: MemoryImportance;
      enabledOnly?: boolean;
      limit?: number;
    } = {},
  ): Promise<MemorySearchResult[]> {
    const {
      category,
      importance,
      enabledOnly = true,
      limit = 20,
    } = options;

    if (!query.trim()) return [];

    // Build WHERE clause
    const conditions: any[] = [];

    if (enabledOnly) {
      conditions.push(eq(memories.enabled, true));
    }

    if (category) conditions.push(eq(memories.category, category));
    if (importance) conditions.push(eq(memories.importance, importance));

    if (query.trim()) {
      conditions.push(ilike(memories.content, `%${query}%`));
    }

    const rows = await this.db.select().from(memories)
      .where(and(...conditions)).orderBy(desc(memories.updatedAt)).limit(limit);
    const entries = rows.map((row) => this.mapToEnhanced(row));

    // Score and filter results
    const results = entries
      .map((entry) => this.scoreEntry(entry, query))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  async getEntriesByCategory(category: MemoryCategory): Promise<MemoryEntryEnhanced[]> {
    const rows = await this.db
      .select()
      .from(memories)
      .where(eq(memories.enabled, true))
      .orderBy(desc(memories.updatedAt));

    return rows
      .map((row) => this.mapToEnhanced(row))
      .filter((entry) => entry.category === category);
  }

  async getEntriesByImportance(
    importance: MemoryImportance,
  ): Promise<MemoryEntryEnhanced[]> {
    const rows = await this.db
      .select()
      .from(memories)
      .where(eq(memories.enabled, true))
      .orderBy(desc(memories.updatedAt));

    return rows
      .map((row) => this.mapToEnhanced(row))
      .filter((entry) => entry.importance === importance);
  }

  // ── Analytics ───────────────────────────────────────────────────

  async getStats(): Promise<MemoryStats> {
    const rows = await this.db.select().from(memories);

    const entries = rows.map((row) => this.mapToEnhanced(row));

    const byCategory: Record<MemoryCategory, number> = {
      personal: 0,
      preference: 0,
      constraint: 0,
      fact: 0,
      goal: 0,
      context: 0,
    };

    const byImportance: Record<MemoryImportance, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let totalAccessCount = 0;
    let lastUpdatedAt: string | null = null;

    for (const entry of entries) {
      byCategory[entry.category] = (byCategory[entry.category] ?? 0) + 1;
      byImportance[entry.importance] =
        (byImportance[entry.importance] ?? 0) + 1;
      totalAccessCount += entry.accessCount;

      if (
        !lastUpdatedAt ||
        new Date(entry.updatedAt) > new Date(lastUpdatedAt)
      ) {
        lastUpdatedAt = entry.updatedAt;
      }
    }

    return {
      totalEntries: entries.length,
      enabledEntries: entries.filter((e) => e.enabled).length,
      archivedEntries: entries.filter((e) => Boolean(e.archivedAt)).length,
      byCategory,
      byImportance,
      totalAccessCount,
      lastUpdatedAt,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────

  private mapToEnhanced(row: any): MemoryEntryEnhanced {
    const tags: string[] = row.tagsJson ? JSON.parse(row.tagsJson) : [];
    const category: MemoryCategory = row.category ?? "fact";
    const importance: MemoryImportance = row.importance ?? "medium";

    return {
      id: row.id,
      content: row.content,
      enabled: row.enabled === 1 || row.enabled === true,
      sourceConversationId: row.sourceConversationId ?? null,
      sourceMessageId: row.sourceMessageId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      archivedAt: row.archivedAt ?? null,
      category,
      importance,
      tags,
      accessCount: row.accessCount ?? 0,
      lastAccessedAt: row.lastAccessedAt ?? null,
    };
  }

  private scoreEntry(entry: MemoryEntryEnhanced, query: string): MemorySearchResult {

    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/).filter(Boolean);

    let score = 0;
    const matchedFields: string[] = [];

    // Score content match
    const contentLower = entry.content.toLowerCase();
    let contentMatches = 0;
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        contentMatches++;
        if (!matchedFields.includes("content")) matchedFields.push("content");
      }
    }
    score += contentMatches * 10;

    // Score tag matches
    let tagMatches = 0;
    for (const tag of entry.tags) {
      if (queryWords.some((w) => tag.toLowerCase().includes(w))) {
        tagMatches++;
        if (!matchedFields.includes("tags")) matchedFields.push("tags");
      }
    }
    score += tagMatches * 15;

    // Boost by importance
    const importanceBoost = {
      critical: 50,
      high: 30,
      medium: 15,
      low: 5,
    }[entry.importance];
    score += importanceBoost;

    // Boost by access count (recently used memories are more relevant)
    score += Math.min(entry.accessCount, 100) * 0.5;

    // Boost recency
    const daysSinceUpdate =
      (Date.now() - new Date(entry.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 1) score += 20;
    else if (daysSinceUpdate < 7) score += 10;
    else if (daysSinceUpdate < 30) score += 5;

    return { entry, score, matchedFields };
  }
}

export function createMemoryRepository(db: AppDatabase): MemoryRepository {
  return new MemoryRepository(db);
}

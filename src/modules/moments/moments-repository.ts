/**
 * MomentsRepository - DB-backed storage for captured moments.
 *
 * Moments are key interactions, successes, milestones, and notes from
 * agent runs that users want to remember and review later.
 */

import type { AppDatabase } from "@/core/db/database";
import { moments } from "@/core/db/schema";
import { and, desc, eq, like, or } from "drizzle-orm";

import type { CreateMomentInput, Moment, MomentStats, MomentType, UpdateMomentInput } from "./types";

export class MomentsRepository {
  constructor(private db: AppDatabase) {}

  // ── CRUD ────────────────────────────────────────────────────────

  async createMoment(input: CreateMomentInput): Promise<Moment> {
    const id = `moment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    const [moment] = await this.db
      .insert(moments)
      .values({
        id,
        title: input.title,
        description: input.description ?? null,
        type: input.type ?? "interaction",
        sourceRunId: input.sourceRunId ?? null,
        sourceConversationId: input.sourceConversationId ?? null,
        tagsJson: JSON.stringify(input.tags ?? []),
        pinned: input.pinned ?? false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapToMoment(moment);
  }

  async getMoment(id: string): Promise<Moment | null> {
    const [row] = await this.db
      .select()
      .from(moments)
      .where(eq(moments.id, id));

    if (!row) return null;
    return this.mapToMoment(row);
  }

  async getMoments(options: {
    type?: MomentType;
    pinnedOnly?: boolean;
    limit?: number;
  } = {}): Promise<Moment[]> {
    const conditions = [];
    if (options.type) conditions.push(eq(moments.type, options.type));
    if (options.pinnedOnly) conditions.push(eq(moments.pinned, true));
    const rows = conditions.length > 0
      ? await this.db.select().from(moments).where(and(...conditions))
          .orderBy(desc(moments.pinned), desc(moments.createdAt)).limit(options.limit ?? 1000)
      : await this.db.select().from(moments)
          .orderBy(desc(moments.pinned), desc(moments.createdAt)).limit(options.limit ?? 1000);
    return rows.map((row) => this.mapToMoment(row));
  }

  async updateMoment(input: UpdateMomentInput): Promise<Moment> {
    const { id, ...updates } = input;
    const now = new Date().toISOString();

    const setValues: Record<string, unknown> = { updatedAt: now };

    if (updates.title !== undefined) setValues.title = updates.title;
    if (updates.description !== undefined) setValues.description = updates.description;
    if (updates.type !== undefined) setValues.type = updates.type;
    if (updates.tags !== undefined) setValues.tagsJson = JSON.stringify(updates.tags);
    if (updates.pinned !== undefined) setValues.pinned = updates.pinned;

    const [moment] = await this.db
      .update(moments)
      .set(setValues)
      .where(eq(moments.id, id))
      .returning();

    return this.mapToMoment(moment);
  }

  async deleteMoment(id: string): Promise<void> {
    await this.db.delete(moments).where(eq(moments.id, id));
  }

  async togglePin(id: string): Promise<Moment> {
    const [row] = await this.db
      .select()
      .from(moments)
      .where(eq(moments.id, id));

    if (!row) {
      throw new Error(`Moment ${id} not found`);
    }

    const newPinned = !row.pinned;
    const now = new Date().toISOString();

    const [moment] = await this.db
      .update(moments)
      .set({ pinned: newPinned, updatedAt: now })
      .where(eq(moments.id, id))
      .returning();

    return this.mapToMoment(moment);
  }

  // ── Search & Filter ─────────────────────────────────────────────

  async searchMoments(query: string): Promise<Moment[]> {
    const rows = await this.db
      .select()
      .from(moments)
      .where(
        or(
          like(moments.title, `%${query}%`),
          like(moments.description, `%${query}%`),
        ),
      )
      .orderBy(desc(moments.pinned), desc(moments.createdAt));

    return rows.map((row) => this.mapToMoment(row));
  }

  async getMomentsByType(type: MomentType): Promise<Moment[]> {
    return this.getMoments({ type });
  }

  async getPinnedMoments(): Promise<Moment[]> {
    return this.getMoments({ pinnedOnly: true });
  }

  // ── Statistics ──────────────────────────────────────────────────

  async getStats(): Promise<MomentStats> {
    const rows = await this.db.select().from(moments);

    const momentsList = rows.map((row) => this.mapToMoment(row));

    const byType: Record<MomentType, number> = {
      success: 0,
      milestone: 0,
      interaction: 0,
    };

    const byMonth: Record<string, number> = {};

    let lastCreatedAt: string | null = null;

    for (const m of momentsList) {
      byType[m.type] = (byType[m.type] ?? 0) + 1;

      const monthKey = m.createdAt.slice(0, 7); // YYYY-MM
      byMonth[monthKey] = (byMonth[monthKey] ?? 0) + 1;

      if (!lastCreatedAt || new Date(m.createdAt) > new Date(lastCreatedAt)) {
        lastCreatedAt = m.createdAt;
      }
    }

    return {
      totalMoments: momentsList.length,
      pinnedMoments: momentsList.filter((m) => m.pinned).length,
      byType,
      byMonth,
      lastCreatedAt,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────

  private mapToMoment(row: any): Moment {
    const tags: string[] = row.tagsJson ? JSON.parse(row.tagsJson) : [];

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type as MomentType,
      sourceRunId: row.source_run_id ?? null,
      sourceConversationId: row.source_conversation_id ?? null,
      tags,
      pinned: row.pinned === 1 || row.pinned === true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export function createMomentsRepository(db: AppDatabase): MomentsRepository {
  return new MomentsRepository(db);
}

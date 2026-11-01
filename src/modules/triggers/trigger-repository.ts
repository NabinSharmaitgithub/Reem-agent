import type { AppDatabase } from "@/core/db/database";
import { triggers, triggerRuns } from "@/core/db/schema";
import { eq, and, desc } from "drizzle-orm";

export type TriggerType = "scheduled" | "notification";
export type TriggerStatus = "pending" | "completed" | "failed";

export type Trigger = {
  id: string;
  title: string;
  description: string | null;
  type: TriggerType;
  prompt: string;
  providerId: string;
  modelId: string;
  agentId: string | null;
  autoApprove: boolean;
  enabled: boolean;
  cronExpression: string | null;
  timezone: string | null;
  weekdays: string[] | null;
  time: string | null;
  notificationAppPackage: string | null;
  notificationAppName: string | null;
  lastTriggeredAt: string | null;
  triggerCount: number;
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTriggerInput = {
  title: string;
  description?: string;
  type: TriggerType;
  prompt: string;
  providerId: string;
  modelId: string;
  agentId?: string;
  autoApprove?: boolean;
  enabled?: boolean;
  cronExpression?: string;
  timezone?: string;
  weekdays?: string[];
  time?: string;
  notificationAppPackage?: string;
  notificationAppName?: string;
};

export type UpdateTriggerInput = Partial<Omit<CreateTriggerInput, "type">> & {
  id: string;
};

export class TriggerRepository {
  constructor(private db: AppDatabase) {}

  async createTrigger(input: CreateTriggerInput): Promise<Trigger> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const [trigger] = await this.db
      .insert(triggers)
      .values({
        id,
        title: input.title,
        description: input.description ?? null,
        type: input.type,
        prompt: input.prompt,
        providerId: input.providerId,
        modelId: input.modelId,
        agentId: input.agentId ?? null,
        autoApprove: input.autoApprove ?? true,
        enabled: input.enabled ?? true,
        cronExpression: input.cronExpression ?? null,
        timezone: input.timezone ?? null,
        weekdays: input.weekdays ?? null,
        time: input.time ?? null,
        notificationAppPackage: input.notificationAppPackage ?? null,
        notificationAppName: input.notificationAppName ?? null,
        lastTriggeredAt: null,
        triggerCount: 0,
        conversationId: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapTrigger(trigger);
  }

  async getTriggers(): Promise<Trigger[]> {
    const rows = await this.db
      .select()
      .from(triggers)
      .orderBy(desc(triggers.updatedAt));
    return rows.map((row) => this.mapTrigger(row));
  }

  async getTrigger(id: string): Promise<Trigger | null> {
    const [row] = await this.db
      .select()
      .from(triggers)
      .where(eq(triggers.id, id));
    return row ? this.mapTrigger(row) : null;
  }

  async updateTrigger(input: UpdateTriggerInput): Promise<Trigger> {
    const { id, ...updates } = input;
    const now = new Date().toISOString();

    const [trigger] = await this.db
      .update(triggers)
      .set({
        ...updates,
        updatedAt: now,
      })
      .where(eq(triggers.id, id))
      .returning();

    return this.mapTrigger(trigger);
  }

  async deleteTrigger(id: string): Promise<void> {
    await this.db.delete(triggers).where(eq(triggers.id, id));
  }

  async setTriggerEnabled(id: string, enabled: boolean): Promise<void> {
    await this.db
      .update(triggers)
      .set({ enabled, updatedAt: new Date().toISOString() })
      .where(eq(triggers.id, id));
  }

  async recordTriggerRun(triggerId: string, runId: string | null): Promise<void> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await this.db.insert(triggerRuns).values({
      id,
      triggerId,
      runId,
      status: "pending",
      triggeredAt: now,
    });

    // Increment trigger count
    await this.db
      .update(triggers)
      .set({
        lastTriggeredAt: now,
        updatedAt: now,
      })
      .where(eq(triggers.id, triggerId));
  }

  async completeTriggerRun(
    triggerId: string,
    runId: string,
    status: TriggerStatus,
    error: string | null = null,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .update(triggerRuns)
      .set({ status, completedAt: now, error })
      .where(eq(triggerRuns.runId, runId));
  }

  async getTriggerRuns(triggerId: string, limit: number = 20): Promise<any[]> {
    return await this.db
      .select()
      .from(triggerRuns)
      .where(eq(triggerRuns.triggerId, triggerId))
      .orderBy(desc(triggerRuns.triggeredAt))
      .limit(limit);
  }

  async getEnabledTriggersByType(type: TriggerType): Promise<Trigger[]> {
    const rows = await this.db
      .select()
      .from(triggers)
      .where(and(eq(triggers.enabled, true), eq(triggers.type, type)))
      .orderBy(desc(triggers.updatedAt));
    return rows.map((row) => this.mapTrigger(row));
  }

  private mapTrigger(row: any): Trigger {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      prompt: row.prompt,
      providerId: row.providerId,
      modelId: row.modelId,
      agentId: row.agentId,
      autoApprove: row.auto_approve === 1 || row.autoApprove === true,
      enabled: row.enabled === 1 || row.enabled === true,
      cronExpression: row.cronExpression,
      timezone: row.timezone,
      weekdays: row.weekdays,
      time: row.time,
      notificationAppPackage: row.notificationAppPackage,
      notificationAppName: row.notificationAppName,
      lastTriggeredAt: row.lastTriggeredAt,
      triggerCount: row.triggerCount,
      conversationId: row.conversationId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export function createTriggerRepository(db: AppDatabase): TriggerRepository {
  return new TriggerRepository(db);
}

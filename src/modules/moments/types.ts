/**
 * Moments types
 *
 * Moments are captured key interactions, successes, milestones, and notes
 * from agent runs that users want to remember and review later.
 */

export type MomentType = "success" | "milestone" | "interaction";

export type Moment = {
  id: string;
  title: string;
  description: string | null;
  type: MomentType;
  sourceRunId: string | null;
  sourceConversationId: string | null;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateMomentInput = {
  title: string;
  description?: string;
  type?: MomentType;
  sourceRunId?: string | null;
  sourceConversationId?: string | null;
  tags?: string[];
  pinned?: boolean;
};

export type UpdateMomentInput = {
  id: string;
  title?: string;
  description?: string;
  type?: MomentType;
  tags?: string[];
  pinned?: boolean;
};

export type MomentStats = {
  totalMoments: number;
  pinnedMoments: number;
  byType: Record<MomentType, number>;
  byMonth: Record<string, number>;
  lastCreatedAt: string | null;
};

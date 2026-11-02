/**
 * Memory Auto-Summarization
 *
 * Extracts durable facts, preferences, constraints, and goals from
 * completed conversations and creates memory entries automatically.
 * Uses heuristics and keyword patterns to identify memory-worthy content
 * without requiring an LLM call.
 */

import type { CreateMemoryEntryInput, MemoryInsight } from "./types";

const PERSONAL_INFO_PATTERNS = [
  /my name is ([A-Za-z\s]+)/i,
  /i am ([A-Za-z\s]+)/i,
  /call me ([A-Za-z\s]+)/i,
  /i live in ([A-Za-z\s,]+)/i,
  /i work at ([A-Za-z\s]+)/i,
  /i study at ([A-Za-z\s]+)/i,
  /i'm from ([A-Za-z\s,]+)/i,
  /i am based in ([A-Za-z\s,]+)/i,
];

const PREFERENCE_PATTERNS = [
  /i prefer ([^.]+)/i,
  /i like ([^.]+)/i,
  /i don't like ([^.]+)/i,
  /i hate ([^.]+)/i,
  /i love ([^.]+)/i,
  /i always ([^.]+)/i,
  /i never ([^.]+)/i,
  /i usually ([^.]+)/i,
];

const CONSTRAINT_PATTERNS = [
  /i can't ([^.]+)/i,
  /i cannot ([^.]+)/i,
  /i am unable to ([^.]+)/i,
  /i don't want ([^.]+)/i,
  /i do not want ([^.]+)/i,
  /please don't ([^.]+)/i,
  /please do not ([^.]+)/i,
  /without ([^.]+)/i,
];

const GOAL_PATTERNS = [
  /i want to ([^.]+)/i,
  /i need to ([^.]+)/i,
  /i'm trying to ([^.]+)/i,
  /i am trying to ([^.]+)/i,
  /my goal is ([^.]+)/i,
  /i'd like to ([^.]+)/i,
  /i would like to ([^.]+)/i,
];

const FACT_PATTERNS = [
  /i have ([^.]+)/i,
  /i own ([^.]+)/i,
  /i use ([^.]+)/i,
  /i drive ([^.]+)/i,
  /i speak ([^.]+)/i,
  /i know ([^.]+)/i,
];

export function extractMemoryInsights(
  conversationText: string,
  sourceMessageId: string,
): MemoryInsight[] {
  const insights: MemoryInsight[] = [];
  const sentences = conversationText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    // Check personal info
    for (const pattern of PERSONAL_INFO_PATTERNS) {
      const match = sentence.match(pattern);
      if (match) {
        insights.push({
          type: "fact",
          content: sentence,
          confidence: 0.85,
          suggestedCategory: "personal",
          suggestedImportance: "high",
          sourceMessageId,
        });
        break;
      }
    }

    // Check preferences
    for (const pattern of PREFERENCE_PATTERNS) {
      const match = sentence.match(pattern);
      if (match) {
        insights.push({
          type: "preference",
          content: sentence,
          confidence: 0.75,
          suggestedCategory: "preference",
          suggestedImportance: "medium",
          sourceMessageId,
        });
        break;
      }
    }

    // Check constraints
    for (const pattern of CONSTRAINT_PATTERNS) {
      const match = sentence.match(pattern);
      if (match) {
        insights.push({
          type: "constraint",
          content: sentence,
          confidence: 0.8,
          suggestedCategory: "constraint",
          suggestedImportance: "high",
          sourceMessageId,
        });
        break;
      }
    }

    // Check goals
    for (const pattern of GOAL_PATTERNS) {
      const match = sentence.match(pattern);
      if (match) {
        insights.push({
          type: "goal",
          content: sentence,
          confidence: 0.7,
          suggestedCategory: "goal",
          suggestedImportance: "medium",
          sourceMessageId,
        });
        break;
      }
    }

    // Check general facts
    for (const pattern of FACT_PATTERNS) {
      const match = sentence.match(pattern);
      if (match) {
        insights.push({
          type: "fact",
          content: sentence,
          confidence: 0.6,
          suggestedCategory: "fact",
          suggestedImportance: "low",
          sourceMessageId,
        });
        break;
      }
    }
  }

  // Deduplicate by content
  const seen = new Set<string>();
  return insights.filter((insight) => {
    if (seen.has(insight.content)) return false;
    seen.add(insight.content);
    return true;
  });
}

export function mapInsightToEntryInput(
  insight: MemoryInsight,
): Omit<CreateMemoryEntryInput, "content"> {
  return {
    category: insight.suggestedCategory,
    importance: insight.suggestedImportance,
  };
}

export function summarizeConversationForMemory(
  messages: { role: string; content: string }[],
): string {
  const userMessages = messages.filter((m) => m.role === "user");
  const assistantMessages = messages.filter((m) => m.role === "assistant");

  const summaryParts: string[] = [];

  // Extract user preferences and facts
  const userText = userMessages.map((m) => m.content).join(" ");
  const insights = extractMemoryInsights(userText, "conversation-summary");

  if (insights.length > 0) {
    summaryParts.push("Key information from this conversation:");
    for (const insight of insights.slice(0, 10)) {
      summaryParts.push(`- ${insight.content}`);
    }
  }

  // Extract task outcomes
  if (assistantMessages.length > 0) {
    const lastAssistantMsg = assistantMessages[assistantMessages.length - 1];
    if (lastAssistantMsg.content.length > 50) {
      summaryParts.push(
        `\nLast assistant response summary: ${lastAssistantMsg.content.slice(0, 200)}...`,
      );
    }
  }

  return summaryParts.join("\n");
}

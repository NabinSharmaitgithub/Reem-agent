/**
 * Trigger Dispatch Service
 *
 * Handles the dispatch of agent runs when triggers fire:
 *
 * 1. **Notification triggers**: When the native `TriggerBroadcastReceiver`
 *    catches a `NOTIFICATION_POSTED` broadcast, it starts a headless JS
 *    task (`TriggerDispatchTask`). This service's headless handler opens
 *    the database, reads enabled notification triggers, matches the
 *    posting app's package against trigger rules, and dispatches agent
 *    runs for each match.
 *
 * 2. **Manual dispatch**: The `dispatchTriggerForPackage` native method
 *    can be called from JS to trigger a dispatch check for a specific
 *    app package.
 *
 * The headless task handler is registered with
 * `AppRegistry.registerHeadlessTask("TriggerDispatchTask", ...)` so it
 * runs even when the app process was killed.
 */

import { AppRegistry } from "react-native";

import { openDatabaseSync } from "expo-sqlite";

import { createRepositories, migrateAppDatabase } from "@/core/db/database";
import { createDrizzleDb } from "@/core/db/repositories/shared";
import type { Repositories } from "@/core/db/repositories/types";
import { triggerRuns } from "@/core/db/schema";
import { createWorkspaceFileService } from "@/core/services/workspace-file-service";
import type {
  AgentRun,
  AppStateSnapshot,
  Conversation,
  StoredMessage,
} from "@/core/types/app-state";
import { createPluginRuntime } from "@/modules/plugins/plugin-runtime";
import { createExecutionTimelineEvent } from "@/modules/runtime/run-artifacts";
import { createRunControllerRegistry } from "@/modules/runtime/run-manager";
import type { Trigger } from "@/modules/triggers/trigger-repository";
import {
  executeClaimedAgentRun,
  executeSubagentTask,
  type AgentRunDeps,
} from "@/providers/app-state/agent-run";
import { resolveConfig } from "@/providers/app-state/config-resolution";
import { buildAssistantMetadata } from "@/providers/app-state/helpers";

export const TRIGGER_DISPATCH_TASK_KEY = "TriggerDispatchTask";

/**
 * Result of creating a triggered agent run.
 */
export type CreateTriggeredRunResult = {
  agentRun: AgentRun;
  assistantMessage: StoredMessage;
  conversation: Conversation;
  userMessage: StoredMessage;
};

/**
 * Create an agent run for a triggered trigger. Mirrors
 * `createScheduledRun` in dispatch.ts but works with `Trigger` objects
 * instead of `Schedule` objects.
 *
 * @param db - Raw drizzle database instance (for triggerRuns inserts)
 * @param repositories - Repository collection
 * @param trigger - The trigger that fired
 */
export async function createTriggeredRun(
  db: Parameters<typeof createRepositories>[0],
  repositories: Repositories,
  trigger: Trigger,
): Promise<CreateTriggeredRunResult> {
  let conversationId = trigger.conversationId;
  let conversation: Conversation | null = null;

  if (conversationId) {
    conversation =
      await repositories.conversationRepository.getById(conversationId);
  }

  if (!conversation) {
    conversation = await repositories.conversationRepository.create({
      title: trigger.title,
      providerId: trigger.providerId,
      modelId: trigger.modelId,
    });
    conversationId = conversation.id;
  }

  const userSequence = await repositories.messageRepository.getNextSequence(
    conversation.id,
  );
  const assistantSequence = userSequence + 1;

  const userMessage = await repositories.messageRepository.create({
    conversationId: conversation.id,
    content: trigger.prompt,
    role: "user",
    sequence: userSequence,
    status: "completed",
  });
  const assistantMessage = await repositories.messageRepository.create({
    conversationId: conversation.id,
    content: "",
    role: "assistant",
    sequence: assistantSequence,
    status: "streaming",
  });
  const agentRun = await repositories.agentRunRepository.create({
    agentId: trigger.agentId,
    agentMode: "build",
    assistantMessageId: assistantMessage.id,
    autoApprove: trigger.autoApprove,
    conversationId: conversation.id,
    externalFolderSession: null,
    fileContextSource: null,
    input: trigger.prompt,
    modelId: trigger.modelId,
    providerId: trigger.providerId,
    selectedFileIds: [],
    status: "queued",
    userMessageId: userMessage.id,
  });

  const assistantMetadata = buildAssistantMetadata({
    executionTimeline: [
      createExecutionTimelineEvent({
        detail: "Triggered job",
        kind: "run",
        status: "pending",
        title: `Triggered: ${trigger.title}`,
        createdAt: agentRun.startedAt,
      }),
    ],
    runId: agentRun.id,
    toolExecutions: [],
  });

  await repositories.messageRepository.updateContent({
    id: assistantMessage.id,
    content: "",
    error: null,
    metadata: assistantMetadata,
    status: "streaming",
  });

  await createDrizzleDb(db).insert(triggerRuns).values({
    id: `trun_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    triggerId: trigger.id,
    runId: agentRun.id,
    status: "queued",
    triggeredAt: agentRun.startedAt,
  });

  return { agentRun, assistantMessage, conversation, userMessage };
}

/**
 * Create a headless run publisher for background dispatch (no UI).
 */
export function createHeadlessRunPublisher() {
  return {
    publishApprovals: (_updater: (current: any[]) => any[]) => {},
    publishError: (_message: string) => {},
    publishSnapshot: () => {},
  };
}

/**
 * Build a headless app state snapshot for trigger dispatch.
 */
export async function buildHeadlessSnapshot(
  repositories: Repositories,
): Promise<AppStateSnapshot> {
  const settings = await repositories.configRepository.getSettings();
  const conversations = await repositories.conversationRepository.list();
  const currentConversation = conversations[0] ?? null;
  const agentRuns = await repositories.agentRunRepository.list();
  const messages = currentConversation
    ? await repositories.messageRepository.listByConversation(
        currentConversation.id,
      )
    : [];
  const memory = await repositories.memoryStore.read();
  const mcpServers = await repositories.mcpServerRepository.list();
  const savedPrompts = await repositories.savedPromptRepository.list();
  const schedules = await repositories.scheduleRepository.list();
  const skills = await repositories.skillRepository.list();
  const plugins = await repositories.pluginRepository.list();
  const workspaceFiles = await repositories.workspaceRepository.list();
  const agents = await repositories.agentRepository.list();
  const resolvedConfig = await resolveConfig(
    {
      modelPresets: await repositories.configRepository.listModelPresets(),
      providers: await repositories.configRepository.listProviderConfigs(),
      settings,
    },
    { discoverRemote: false },
  );

  return {
    activeProviderAccountIds: {},
    agentRuns,
    agents,
    conversations,
    currentConversation,
    currentSelectedAgentId: currentConversation?.agentId ?? null,
    currentSelectedFileIds: currentConversation?.selectedFileIds ?? [],
    currentSelectedMcpServerIds:
      currentConversation?.selectedMcpServerIds ?? null,
    currentSelectedSkillIds: currentConversation?.selectedSkillIds ?? [],
    memory,
    mcpServers,
    messages,
    pendingInputs: await repositories.pendingInputRepository.listAll(),
    plugins,
    providerAccounts: [],
    savedPrompts,
    schedules,
    skills,
    workspaceFiles,
    resolvedConfig,
    settings,
  } satisfies AppStateSnapshot;
}

/**
 * Build headless agent run dependencies for trigger dispatch.
 */
export function buildHeadlessAgentRunDeps(input: {
  repositories: Repositories;
  runRegistry: ReturnType<typeof createRunControllerRegistry>;
  snapshotRef: { current: AppStateSnapshot };
  workspaceService: ReturnType<typeof createWorkspaceFileService>;
  pluginRuntimeSnapshot?: AgentRunDeps["pluginRuntimeSnapshot"];
}): AgentRunDeps {
  const {
    pluginRuntimeSnapshot,
    repositories,
    runRegistry,
    snapshotRef,
    workspaceService,
  } = input;

  const deps: AgentRunDeps = {
    repositories,
    snapshotRef,
    runRegistry,
    workspaceService,
    updateRunRecord: async (runId, runInput) => {
      await repositories.agentRunRepository.update(runId, runInput);
      return repositories.agentRunRepository.getById(runId);
    },
    requestToolApproval: async () => "deny" as const,
    requestRunQuestionnaire: async () => null,
    requestSecretAnswer: async () => ({ status: "deferred" }) as const,
    generateAndApplyConversationTitle: async () => {},
    notifyRunStateChange: async ({
      announcement,
      body,
      conversationId,
      status,
      title,
    }) => {
      if (
        announcement ||
        snapshotRef.current.settings.notificationSettings.runFinished
      ) {
        const { notifyRunFinishedAsync } =
          await import("@/modules/notifications/run-notifications");
        await notifyRunFinishedAsync({
          body:
            status === "success" && announcement?.message
              ? announcement.message
              : body,
          conversationId,
          status,
          title,
        });
      }
    },
    onSkillsChange: () => {},
    onPluginsChange: () => {},
    onAgentsChange: () => {},
    ui: createHeadlessRunPublisher(),
    retryRun: (runId, delayMs) => {
      setTimeout(() => {
        void executeClaimedAgentRun(runId, deps).catch(() => {});
      }, delayMs);
    },
    shouldKeepBackgroundAgentAlive: () => runRegistry.hasActiveRuns(),
    refreshScheduler: () => {},
    spawnSubagent: (task) => executeSubagentTask(deps, task),
    pluginRuntimeSnapshot,
  };

  return deps;
}

/**
 * Dispatch a triggered agent run headlessly. Opens the database directly,
 * creates the run, and executes it via `executeClaimedAgentRun`.
 */
export async function dispatchTriggeredRunHeadless(
  repositories: Repositories,
  trigger: Trigger,
): Promise<AgentRun> {
  const db = openDatabaseSync("mobile-agent.db");
  try {
    await migrateAppDatabase(db);
    const repos = createRepositories(db);

    const { agentRun } = await createTriggeredRun(db, repos, trigger);
    const snapshot = await buildHeadlessSnapshot(repos);
    const snapshotRef: { current: AppStateSnapshot } = { current: snapshot };
    const runRegistry = createRunControllerRegistry();
    const workspaceService = createWorkspaceFileService(
      repos.workspaceRepository,
    );
    const pluginRuntime = createPluginRuntime(repos.pluginRepository.storage);
    await pluginRuntime.load(snapshot.plugins);

    try {
      await executeClaimedAgentRun(
        agentRun.id,
        buildHeadlessAgentRunDeps({
          repositories: repos,
          runRegistry,
          snapshotRef,
          workspaceService,
          pluginRuntimeSnapshot: pluginRuntime.snapshot(agentRun.id),
        }),
      );
    } finally {
      await pluginRuntime.dispose();
    }

    return agentRun;
  } finally {
    db.closeSync();
  }
}

/**
 * Headless task handler for `TriggerDispatchTask`. Called by the native
 * `TriggerBroadcastReceiver` when a notification arrives from an app that
 * matches an enabled notification trigger.
 *
 * Receives task data with:
 *   - package: The app package that posted the notification
 *   - postTimeMs: When the notification was posted
 *   - key: The notification key
 */
export async function runTriggerDispatchHeadless(taskData: {
  package: string;
  postTimeMs: number;
  key: string;
}): Promise<void> {
  const db = openDatabaseSync("mobile-agent.db");

  try {
    await migrateAppDatabase(db);
    const repositories = createRepositories(db);

    const { package: packageName } = taskData;

    // Load all enabled notification triggers
    const triggerRepo = repositories.triggerRepository;
    const triggers = await triggerRepo.getEnabledTriggersByType("notification");

    // Filter to triggers matching this app package
    const matchingTriggers = triggers.filter(
      (t) =>
        t.notificationAppPackage &&
        t.notificationAppPackage.toLowerCase() === packageName.toLowerCase(),
    );

    if (matchingTriggers.length === 0) {
      console.log(
        `[TriggerDispatch] No matching notification triggers for package: ${packageName}`,
      );
      return;
    }

    console.log(
      `[TriggerDispatch] Firing ${matchingTriggers.length} trigger(s) for package: ${packageName}`,
    );

    // Dispatch a run for each matching trigger
    for (const trigger of matchingTriggers) {
      try {
        const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        await triggerRepo.recordTriggerRun(trigger.id, runId);

        await dispatchTriggeredRunHeadless(repositories, trigger);

        console.log(
          `[TriggerDispatch] Dispatched run for trigger: ${trigger.title}`,
        );
      } catch (error) {
        console.error(
          `[TriggerDispatch] Failed to dispatch trigger "${trigger.title}":`,
          error,
        );
      }
    }
  } catch (error) {
    console.error("[TriggerDispatch] Headless task failed:", error);
    throw error;
  } finally {
    db.closeSync();
  }
}

/**
 * Register the headless task handler. Call this once at app startup
 * (from index.js or similar) so the native broadcast receiver can
 * trigger the dispatch even when the app process was killed.
 */
export function registerTriggerDispatchHeadlessTask() {
  AppRegistry.registerHeadlessTask(
    TRIGGER_DISPATCH_TASK_KEY,
    () =>
      async (taskData: {
        package: string;
        postTimeMs: number;
        key: string;
      }) => {
        try {
          await runTriggerDispatchHeadless(taskData);
        } catch (error) {
          console.error("[TriggerDispatch] Headless task failed:", error);
        }
      },
  );
}

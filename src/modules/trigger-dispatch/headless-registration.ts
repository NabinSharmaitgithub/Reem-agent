import { registerTriggerDispatchHeadlessTask } from "./trigger-dispatch-service";

/**
 * Side-effect module: registers the `TriggerDispatchTask` headless handler with
 * React Native at bundle evaluation time. The custom entry point (index.js)
 * imports this so the native TriggerBroadcastReceiver can dispatch agent runs
 * even when no Activity (and therefore no app render) was started.
 */
registerTriggerDispatchHeadlessTask();

// Custom entry point: registers the headless scheduler wake task before
// starting the normal app so the native alarm receiver can run the scheduler
// even when the app process was killed.
import "./src/modules/scheduler/headless-registration";

// Register the trigger dispatch headless task so the native
// TriggerBroadcastReceiver can fire agent runs when notifications arrive
// from apps matching enabled notification triggers.
import "./src/modules/trigger-dispatch/headless-registration";

import "expo-router/entry";

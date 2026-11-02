package expo.modules.scheduleralarm

import android.content.Context
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext

/**
 * Boots the React Native host (if needed) and runs the `SchedulerWakeTask`
 * headless JS task so the scheduler can dispatch due runs and re-arm alarms
 * even when the app process was killed.
 *
 * Shared by [SchedulerWakeService] (normal path) and the alarm receivers
 * (fallback path when a foreground service cannot be started from the
 * background).
 */
internal object SchedulerHeadless {
  private const val TAG = "SchedulerHeadless"

  fun dispatch(context: Context, scheduleId: String) {
    try {
      val appContext = context.applicationContext
      if (appContext !is ReactApplication) return

      val reactHost = appContext.reactHost ?: return
      val runningContext = reactHost.currentReactContext

      if (runningContext != null && runningContext.hasActiveReactInstance()) {
        // The JS scheduler engine is already ticking. Running the headless task
        // here would race the engine and dispatch duplicate runs.
        Log.d(TAG, "App already running; skipping headless wake")
        return
      }

      reactHost.addReactInstanceEventListener(
        object : ReactInstanceEventListener {
          override fun onReactContextInitialized(context: ReactContext) {
            reactHost.removeReactInstanceEventListener(this)
            runHeadlessTask(context, scheduleId)
          }
        },
      )
      reactHost.start()
    } catch (e: Exception) {
      Log.e(TAG, "Failed to start headless wake", e)
    }
  }

  private fun runHeadlessTask(reactContext: ReactContext, scheduleId: String) {
    try {
      val taskContext = HeadlessJsTaskContext.getInstance(reactContext)
      val taskData = Arguments.createMap()
      taskData.putString(SchedulerAlarmManager.EXTRA_SCHEDULE_ID, scheduleId)
      val taskConfig = HeadlessJsTaskConfig(
        taskKey = "SchedulerWakeTask",
        data = taskData,
        // No timeout: the headless run must be allowed to finish. The task
        // keeps the process alive until the JS side calls finishHeadlessTask.
        timeout = 0L,
        // Scheduled runs must fire even if the app happens to be open.
        isAllowedInForeground = true,
      )
      taskContext.startTask(taskConfig)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to run headless task", e)
    }
  }
}

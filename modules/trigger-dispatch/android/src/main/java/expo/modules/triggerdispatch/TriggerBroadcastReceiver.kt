package expo.modules.triggerdispatch

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext

/**
 * BroadcastReceiver that catches notification-posted broadcasts from
 * [NotificationTriggerListener] and dispatches a headless JS task to check
 * and fire any matching notification triggers.
 *
 * When the app process is alive, the headless task runs inline.
 * When the process was killed, this receiver wakes it up via
 * ReactInstanceEventListener and then runs the task.
 */
class TriggerBroadcastReceiver : BroadcastReceiver() {

  private val TAG = "TriggerBroadcastReceiver"

  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    val packageName = intent.getStringExtra("package") ?: return
    val postTimeMs = intent.getLongExtra("postTimeMs", 0)
    val key = intent.getStringExtra("key") ?: ""

    Log.d(TAG, "Notification posted from $packageName at $postTimeMs ($action)")

    val appContext = context.applicationContext
    if (appContext !is ReactApplication) {
      Log.w(TAG, "Application is not ReactApplication, cannot dispatch headless task")
      return
    }

    val reactHost = appContext.reactHost ?: return
    val runningContext = reactHost.currentReactContext

    if (runningContext != null && runningContext.hasActiveReactInstance()) {
      // App is running, dispatch inline
      runHeadlessTask(runningContext, packageName, postTimeMs, key)
    } else {
      // App not running, start React Native and run headless task when ready
      reactHost.addReactInstanceEventListener(
        object : ReactInstanceEventListener {
          override fun onReactContextInitialized(context: ReactContext) {
            reactHost.removeReactInstanceEventListener(this)
            runHeadlessTask(context, packageName, postTimeMs, key)
          }
        },
      )
      reactHost.start()
    }
  }

  private fun runHeadlessTask(
    reactContext: ReactContext,
    packageName: String,
    postTimeMs: Long,
    key: String,
  ) {
    try {
      val taskContext = HeadlessJsTaskContext.getInstance(reactContext)
      val taskConfig = HeadlessJsTaskConfig(
        taskKey = "TriggerDispatchTask",
        data = buildTaskData(packageName, postTimeMs, key),
        timeout = 30_000L,
        // Triggers must fire whether Reem is in the foreground or not; the js
        // handler is idempotent per notification key.
        isAllowedInForeground = true,
      )
      taskContext.startTask(taskConfig)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to start trigger dispatch headless task", e)
    }
  }

  private fun buildTaskData(packageName: String, postTimeMs: Long, key: String): WritableMap {
    val map = Arguments.createMap()
    map.putString("package", packageName)
    map.putDouble("postTimeMs", postTimeMs.toDouble())
    map.putString("key", key)
    return map
  }
}

package expo.modules.scheduleralarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Fired by AlarmManager when a scheduled task comes due. Delegates to
 * [SchedulerWakeService], which boots the headless JS scheduler when the app
 * process was killed (when the process is alive the JS engine handles the
 * tick itself and the wake service is a no-op).
 */
class SchedulerAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val scheduleId = intent.getStringExtra(SchedulerAlarmManager.EXTRA_SCHEDULE_ID)
      ?: "tick"

    try {
      val serviceIntent = Intent(context, SchedulerWakeService::class.java).apply {
        putExtra(SchedulerAlarmManager.EXTRA_SCHEDULE_ID, scheduleId)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(serviceIntent)
      } else {
        context.startService(serviceIntent)
      }
    } catch (e: Exception) {
      // Android 12+ rejects foreground-service starts from the background
      // unless the app is exempt. The receiver is still within its execution
      // window, so boot the React host directly as a fallback.
      Log.w("SchedulerAlarm", "Cannot start wake service, dispatching inline", e)
      SchedulerHeadless.dispatch(context, scheduleId)
    }
  }
}

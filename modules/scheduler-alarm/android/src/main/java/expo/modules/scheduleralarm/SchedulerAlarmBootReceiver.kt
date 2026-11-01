package expo.modules.scheduleralarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Re-syncs alarms after a device reboot. Boot receivers are exempt from
 * background-service start restrictions, so the wake service boots the headless
 * JS scheduler which re-reads the database and re-arms every alarm.
 */
class SchedulerAlarmBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

    try {
      val serviceIntent = Intent(context, SchedulerWakeService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(serviceIntent)
      } else {
        context.startService(serviceIntent)
      }
    } catch (e: Exception) {
      Log.w("SchedulerAlarm", "Cannot start wake service after boot, dispatching inline", e)
      SchedulerHeadless.dispatch(context, "tick")
    }
  }
}

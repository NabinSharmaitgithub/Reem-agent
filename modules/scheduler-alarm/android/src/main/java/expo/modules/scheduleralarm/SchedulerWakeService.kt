package expo.modules.scheduleralarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

/**
 * Wakes the app process and runs the `SchedulerWakeTask` headless JS task so
 * the scheduler can dispatch due runs and re-arm alarms.
 *
 * Declared as a `dataSync` foreground service: alarm receivers run while the
 * app is in the background, where a plain `startService` is rejected on
 * Android 8+ and a foreground service start needs an immediate notification.
 */
class SchedulerWakeService : Service() {

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    ensureNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // Must happen right away: the system kills the process if a service
    // started with startForegroundService does not post a notification.
    goForeground()

    val scheduleId = intent?.getStringExtra(SchedulerAlarmManager.EXTRA_SCHEDULE_ID)
      ?: "tick"

    SchedulerHeadless.dispatch(this, scheduleId)
    stopSelf(startId)
    return START_NOT_STICKY
  }

  private fun ensureNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Scheduled runs",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "Keeps Reem alive while a scheduled task starts"
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  private fun goForeground() {
    val notification: Notification = Notification.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.stat_notify_sync)
      .setContentTitle("Reem")
      .setContentText("Starting a scheduled task…")
      .setOngoing(true)
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private companion object {
    const val CHANNEL_ID = "scheduler-wake"
    const val NOTIFICATION_ID = 9312
  }
}

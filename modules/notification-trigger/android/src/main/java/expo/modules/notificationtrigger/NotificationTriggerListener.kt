package expo.modules.notificationtrigger

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.content.Intent
import android.util.Log

/**
 * NotificationListenerService that monitors posted notifications and can
 * trigger agent runs when a notification arrives from a user-specified app.
 *
 * Requires android.permission.BIND_NOTIFICATION_LISTENER_SERVICE and the user
 * must enable the listener in Settings → Apps → Special app access →
 * Notification access → Reem.
 */
class NotificationTriggerListener : NotificationListenerService() {

  companion object {
    const val TAG = "NotificationTriggerListener"
    @Volatile var isListenerEnabled: Boolean = false
    /** Last posted notification package + timestamp, for the module to read. */
    @Volatile var lastNotification: String? = null
    @Volatile var lastNotificationTimeMs: Long = 0
  }

  override fun onListenerConnected() {
    super.onListenerConnected()
    isListenerEnabled = true
    Log.i(TAG, "Notification listener connected")
  }

  override fun onListenerDisconnected() {
    super.onListenerDisconnected()
    isListenerEnabled = false
    Log.w(TAG, "Notification listener disconnected")
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    sbn ?: return
    val pkg = sbn.packageName ?: return
    val postTime = sbn.postTime
    lastNotification = pkg
    lastNotificationTimeMs = postTime
    Log.d(TAG, "Notification posted from $pkg at $postTime")

    // Broadcast to the app so it can check trigger rules and potentially
    // dispatch an agent run.
    val intent = Intent("expo.modules.notificationtrigger.NOTIFICATION_POSTED")
      .putExtra("package", pkg)
      .putExtra("postTimeMs", postTime)
      .putExtra("key", sbn.key)
    intent.addFlags(Intent.FLAG_RECEIVER_FOREGROUND)
    sendBroadcast(intent)
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification?) {
    sbn ?: return
    Log.d(TAG, "Notification removed from ${sbn.packageName}")
  }
}

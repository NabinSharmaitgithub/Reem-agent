package expo.modules.notificationtrigger

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo module for notification-based triggers:
 *
 * - isNotificationListenerEnabled() → Boolean
 * - openNotificationListenerSettings() → Void
 * - getLastNotification() → Map (package, postTimeMs)
 */
class NotificationTriggerModule : Module() {

  private val reactContext: ReactApplicationContext
    get() = appContext.reactContext as? ReactApplicationContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("NotificationTrigger")

    Events(
      "onNotificationPosted",
    )

    AsyncFunction("isNotificationListenerEnabled") {
      NotificationTriggerListener.isListenerEnabled || isListenerInEnabledList()
    }

    AsyncFunction("openNotificationListenerSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      Unit
    }

    AsyncFunction("getLastNotification") {
      val pkg = NotificationTriggerListener.lastNotification
      val time = NotificationTriggerListener.lastNotificationTimeMs
      mapOf(
        "package" to (pkg ?: ""),
        "postTimeMs" to time,
      )
    }
  }

  private fun isListenerInEnabledList(): Boolean {
    val enabled = Settings.Secure.getString(
      reactContext.contentResolver,
      "enabled_notification_listeners",
    ) ?: return false
    val component = ComponentName(
      reactContext.packageName,
      NotificationTriggerListener::class.java.name,
    ).flattenToString()
    return enabled.split(":").any { it.equals(component, ignoreCase = true) }
  }
}

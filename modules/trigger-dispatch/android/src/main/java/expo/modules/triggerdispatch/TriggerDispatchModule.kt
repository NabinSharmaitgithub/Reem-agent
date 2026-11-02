package expo.modules.triggerdispatch

import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo module for trigger dispatch coordination.
 *
 * The manifest-declared [TriggerBroadcastReceiver] catches notification-posted
 * broadcasts from [expo.modules.notificationtrigger.NotificationTriggerListener]
 * and starts the `TriggerDispatchTask` headless JS task. This module only
 * exposes a manual dispatch entry point for JS-initiated checks.
 */
class TriggerDispatchModule : Module() {

  private val reactContext: ReactApplicationContext
    get() = appContext.reactContext as? ReactApplicationContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("TriggerDispatch")

    Events(
      "onTriggerFired",
      "onTriggerMatched",
    )

    AsyncFunction("dispatchTriggerForPackage") { packageName: String ->
      val intent = Intent(NOTIFICATION_POSTED_ACTION).apply {
        setPackage(reactContext.packageName)
        putExtra("package", packageName)
        putExtra("postTimeMs", System.currentTimeMillis())
        putExtra("key", "")
      }
      reactContext.sendBroadcast(intent)
      Unit
    }

    AsyncFunction("getRegisteredTriggers") {
      // Triggers live in the JS database; the native side has nothing to list.
      emptyList<Any>()
    }
  }

  companion object {
    const val NOTIFICATION_POSTED_ACTION =
      "expo.modules.notificationtrigger.NOTIFICATION_POSTED"
  }
}

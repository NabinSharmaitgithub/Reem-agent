package expo.modules.floatingbutton

import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo module for the Floating Panda Button overlay:
 *
 * - isOverlayPermissionGranted() → Boolean
 * - openOverlaySettings() → Void
 * - showFloatingButton() → Void
 * - hideFloatingButton() → Void
 * - toggleFloatingButton() → Void
 * - isFloatingButtonVisible() → Boolean
 */
class FloatingButtonModule : Module() {

  private val reactContext: ReactApplicationContext
    get() = appContext.reactContext as? ReactApplicationContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("FloatingButton")

    Events(
      "onFloatingButtonShown",
      "onFloatingButtonHidden",
    )

    AsyncFunction("isOverlayPermissionGranted") {
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
        Settings.canDrawOverlays(reactContext)
      } else {
        true
      }
    }

    AsyncFunction("openOverlaySettings") {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        android.net.Uri.parse("package:${reactContext.packageName}")
      ).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      Unit
    }

    AsyncFunction("showFloatingButton") {
      show()
      sendEvent("onFloatingButtonShown")
      Unit
    }

    AsyncFunction("hideFloatingButton") {
      hide()
      sendEvent("onFloatingButtonHidden")
      Unit
    }

    AsyncFunction("toggleFloatingButton") {
      if (FloatingButtonService.isVisible) {
        hide()
        sendEvent("onFloatingButtonHidden")
      } else {
        show()
        sendEvent("onFloatingButtonShown")
      }
      Unit
    }

    AsyncFunction("isFloatingButtonVisible") {
      FloatingButtonService.isVisible
    }
  }

  private fun show() {
    val intent = Intent(reactContext, FloatingButtonService::class.java).apply {
      action = FloatingButtonService.ACTION_SHOW
    }
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      reactContext.startForegroundService(intent)
    } else {
      reactContext.startService(intent)
    }
  }

  private fun hide() {
    val intent = Intent(reactContext, FloatingButtonService::class.java).apply {
      action = FloatingButtonService.ACTION_HIDE
    }
    reactContext.stopService(intent)
    FloatingButtonService.isVisible = false
  }
}

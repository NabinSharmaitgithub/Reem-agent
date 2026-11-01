package expo.modules.homescreenwidget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo module for Home Screen Widget:
 *
 * - isWidgetAvailable() → Boolean
 * - getWidgetIds() → number[] (currently active widget instance IDs)
 * - openWidgetSettings() → Void (pins the widget, or opens app settings)
 */
class HomeScreenWidgetModule : Module() {

  private val reactContext: ReactApplicationContext
    get() = appContext.reactContext as? ReactApplicationContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("HomeScreenWidget")

    Events(
      "onWidgetAdded",
      "onWidgetRemoved",
    )

    AsyncFunction("isWidgetAvailable") {
      true
    }

    AsyncFunction("getWidgetIds") {
      val manager = reactContext.getSystemService(Context.APPWIDGET_SERVICE) as AppWidgetManager
      val component = ComponentName(
        reactContext.packageName,
        "expo.modules.homescreenwidget.HomeScreenWidgetProvider",
      )
      manager.getAppWidgetIds(component).map { it.toInt() }
    }

    AsyncFunction("openWidgetSettings") {
      val manager = reactContext.getSystemService(Context.APPWIDGET_SERVICE) as AppWidgetManager
      val provider = ComponentName(
        reactContext.packageName,
        "expo.modules.homescreenwidget.HomeScreenWidgetProvider",
      )
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.isRequestPinAppWidgetSupported) {
        manager.requestPinAppWidget(provider, null, null)
      } else {
        // No pinning API before Android 8: open the app's settings page so the
        // user can add the widget from the launcher's widget picker.
        val intent = Intent(
          Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
          Uri.parse("package:${reactContext.packageName}"),
        ).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactContext.startActivity(intent)
      }
      Unit
    }
  }
}

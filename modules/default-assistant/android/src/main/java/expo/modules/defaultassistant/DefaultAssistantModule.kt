package expo.modules.defaultassistant

import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Native module for setting Reem as the device's default AI assistant.
 *
 * Uses android.app.role.RoleManager (API 29+) to:
 * - Check if Reem is the current default assistant
 * - Request the user to set Reem as the default assistant via system dialog
 *
 * Requires no special permissions — RoleManager handles the user consent UI.
 */
class DefaultAssistantModule : Module() {

  private val reactContext: ReactApplicationContext
    get() = appContext.reactContext as? ReactApplicationContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("DefaultAssistant")

    Events(
      "onDefaultAssistantChanged",
    )

    AsyncFunction("isDefaultAssistantAvailable") {
      // RoleManager is available on API 29+
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
    }

    AsyncFunction("isDefaultAssistant") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        false
      } else {
        val roleManager = reactContext.getSystemService(Context.ROLE_SERVICE) as RoleManager
        roleManager.isRoleHeld(RoleManager.ROLE_ASSISTANT)
      }
    }

    AsyncFunction("requestDefaultAssistant") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        throw IllegalStateException("Default assistant role requires Android 10 (API 29) or higher")
      }

      val roleManager = reactContext.getSystemService(Context.ROLE_SERVICE) as RoleManager

      if (!roleManager.isRoleAvailable(RoleManager.ROLE_ASSISTANT)) {
        throw IllegalStateException("Assistant role is not available on this device")
      }

      if (roleManager.isRoleHeld(RoleManager.ROLE_ASSISTANT)) {
        // Already the default assistant
        sendEvent("onDefaultAssistantChanged", mapOf("isDefault" to true))
      } else {
        // Request the user to set Reem as default assistant
        val requestIntent = roleManager.createRequestRoleIntent(RoleManager.ROLE_ASSISTANT)
        requestIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(requestIntent)
      }
      true
    }

    AsyncFunction("openDefaultAppsSettings") {
      // Open the system Default apps settings where the user can manage the assistant
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val roleManager = reactContext.getSystemService(Context.ROLE_SERVICE) as RoleManager
        if (roleManager.isRoleAvailable(RoleManager.ROLE_ASSISTANT)) {
          roleManager.createRequestRoleIntent(RoleManager.ROLE_ASSISTANT)
        } else {
          Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS)
        }
      } else {
        Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS)
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      Unit
    }
  }
}

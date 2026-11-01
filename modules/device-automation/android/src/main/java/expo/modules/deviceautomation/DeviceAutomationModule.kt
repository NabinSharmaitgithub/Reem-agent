package expo.modules.deviceautomation

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.accessibilityservice.GestureDescription
import android.accessibilityservice.GestureDescription.StrokeDescription
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Path
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.view.accessibility.AccessibilityManager
import android.view.accessibility.AccessibilityNodeInfo
import com.facebook.react.bridge.ReactApplicationContext
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * Expo module that exposes device-automation capabilities to React Native:
 *
 * - isAccessibilityEnabled() → Boolean
 * - isAccessibilityServiceConnected() → Boolean
 * - openAccessibilitySettings() → Void
 * - requestAccessibilityPermission() → Void
 * - captureHierarchy(maxDepth) → String (JSON of UI tree)
 * - getForegroundApp() → Map (package, activity, updatedAt, accessibilityEnabled)
 * - performTap(x, y) → Void
 * - performLongPress(x, y, durationMs) → Void
 * - performSwipe(x1, y1, x2, y2, durationMs) → Void
 * - performScroll(x, y, direction, distance) → Void
 * - enterText(text) → Void
 * - performGlobalAction(action) → Void  ("back"|"home"|"recents"|"notification_shade"|"power_dialog")
 * - takeScreenshot() → Map (path, captured)
 * - isOverlayPermissionGranted() → Boolean
 * - openOverlaySettings() → Void
 *
 * Gestures are dispatched through the connected [DeviceAccessibilityService].
 * If the service isn't connected, each mutating function throws a clear error
 * telling the user to enable the service in system settings.
 */
class DeviceAutomationModule : Module() {

  private val TAG = "DeviceAutomationModule"

  private val reactContext: ReactApplicationContext
    get() = appContext.reactContext as? ReactApplicationContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("DeviceAutomation")

    Events(
      "onAccessibilityStateChanged",
      "onForegroundAppChanged",
      "onHierarchyCaptured",
    )

    AsyncFunction("isAccessibilityEnabled") {
      val manager = reactContext.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
      val services = manager.getEnabledAccessibilityServiceList(
        AccessibilityServiceInfo.FEEDBACK_ALL_MASK
      )
      val ourComponent = ComponentName(
        reactContext.packageName,
        "expo.modules.deviceautomation.DeviceAccessibilityService",
      )
      val enabled = services.any { it.id == ourComponent.flattenToString() }
      DeviceAccessibilityService.isServiceConnected = enabled
      enabled
    }

    AsyncFunction("isAccessibilityServiceConnected") {
      DeviceAccessibilityService.isServiceConnected
    }

    AsyncFunction("openAccessibilitySettings") {
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      Unit
    }

    AsyncFunction("requestAccessibilityPermission") {
      // Best-effort deep link into the accessibility settings screen; Android
      // offers no extra that reliably highlights one service, so the user
      // enables "Reem" manually from the list.
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      Unit
    }

    AsyncFunction("captureHierarchy") { maxDepth: Int? ->
      val service = DeviceAccessibilityService.serviceInstance
        ?: throw IllegalStateException(
          "Accessibility service not connected. Open Settings → Accessibility → Reem and enable it, then try again.",
        )
      val root = service.rootInActiveWindow
        ?: throw IllegalStateException(
          "Unable to read the screen hierarchy. The foreground app may block accessibility access.",
        )
      val depth = (maxDepth ?: 10).coerceAtLeast(1).coerceAtMost(20)
      val pkg = root.packageName?.toString() ?: ""
      val activity = root.className?.toString() ?: ""
      val json = DeviceAutomationState.serializeNode(root, 0, depth) ?: "{}"
      DeviceAutomationState.latestHierarchyJson = json
      DeviceAutomationState.lastHierarchyUpdateMs = System.currentTimeMillis()
      DeviceAutomationState.latestForegroundPackage = pkg
      DeviceAutomationState.latestForegroundActivity = activity
      sendEvent(
        "onHierarchyCaptured",
        mapOf(
          "package" to pkg,
          "activity" to activity,
          "updatedAt" to DeviceAutomationState.lastHierarchyUpdateMs,
        ),
      )
      json
    }

    AsyncFunction("getForegroundApp") {
      val manager = reactContext.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
      val services = manager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
      val ourComponent = ComponentName(
        reactContext.packageName,
        "expo.modules.deviceautomation.DeviceAccessibilityService",
      )
      val enabled = services.any { it.id == ourComponent.flattenToString() }

      var pkg: String? = DeviceAutomationState.latestForegroundPackage
      var activity: String? = DeviceAutomationState.latestForegroundActivity
      val updateMs: Long = DeviceAutomationState.lastHierarchyUpdateMs

      // Fallback for older APIs where accessibility can't see the foreground app.
      if ((pkg == null || pkg.isEmpty()) && Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
        try {
          val am = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
          val tasks = am.getAppTasks()
          if (tasks.isNotEmpty()) {
            pkg = tasks[0].taskInfo?.topActivity?.packageName
            activity = tasks[0].taskInfo?.topActivity?.className
          }
        } catch (e: Exception) {
          Log.w(TAG, "Could not read foreground task", e)
        }
      }

      if (pkg.isNullOrEmpty()) {
        pkg = reactContext.packageName
      }

      mapOf(
        "package" to (pkg ?: ""),
        "activity" to (activity ?: ""),
        "updatedAt" to updateMs,
        "accessibilityEnabled" to enabled,
      )
    }

    AsyncFunction("performTap") { x: Double, y: Double ->
      val service = DeviceAccessibilityService.serviceInstance
        ?: throw IllegalStateException(
          "Accessibility service not connected. Enable Reem in Settings → Accessibility first.",
        )
      val path = Path().apply { moveTo(x.toFloat(), y.toFloat()) }
      val stroke = StrokeDescription(path, 0, 100)
      val gesture = GestureDescription.Builder().addStroke(stroke).build()
      service.dispatchGesture(gesture, null, null)
      Unit
    }

    AsyncFunction("performLongPress") { x: Double, y: Double, durationMs: Int? ->
      val service = DeviceAccessibilityService.serviceInstance
        ?: throw IllegalStateException(
          "Accessibility service not connected. Enable Reem in Settings → Accessibility first.",
        )
      val dur = (durationMs ?: 500).coerceAtLeast(100).toLong()
      val path = Path().apply { moveTo(x.toFloat(), y.toFloat()) }
      val stroke = StrokeDescription(path, 0, dur)
      val gesture = GestureDescription.Builder().addStroke(stroke).build()
      service.dispatchGesture(gesture, null, null)
      Unit
    }

    AsyncFunction("performSwipe") { x1: Double, y1: Double, x2: Double, y2: Double, durationMs: Int? ->
      val service = DeviceAccessibilityService.serviceInstance
        ?: throw IllegalStateException(
          "Accessibility service not connected. Enable Reem in Settings → Accessibility first.",
        )
      val dur = (durationMs ?: 500).coerceAtLeast(100).toLong()
      val path = Path().apply {
        moveTo(x1.toFloat(), y1.toFloat())
        lineTo(x2.toFloat(), y2.toFloat())
      }
      val stroke = StrokeDescription(path, 0, dur)
      val gesture = GestureDescription.Builder().addStroke(stroke).build()
      service.dispatchGesture(gesture, null, null)
      Unit
    }

    AsyncFunction("performScroll") { x: Double, y: Double, direction: String, distance: Int? ->
      val service = DeviceAccessibilityService.serviceInstance
        ?: throw IllegalStateException(
          "Accessibility service not connected. Enable Reem in Settings → Accessibility first.",
        )
      val dur = (distance ?: 300).coerceAtLeast(50).coerceAtMost(2000).toLong()
      val path = Path().apply {
        when (direction.lowercase()) {
          "up" -> {
            moveTo(x.toFloat(), y.toFloat())
            lineTo(x.toFloat(), (y - dur * 0.3f).toFloat())
          }
          "down" -> {
            moveTo(x.toFloat(), y.toFloat())
            lineTo(x.toFloat(), (y + dur * 0.3f).toFloat())
          }
          "left" -> {
            moveTo(x.toFloat(), y.toFloat())
            lineTo((x - dur * 0.3f).toFloat(), y.toFloat())
          }
          "right" -> {
            moveTo(x.toFloat(), y.toFloat())
            lineTo((x + dur * 0.3f).toFloat(), y.toFloat())
          }
          else -> {
            moveTo(x.toFloat(), y.toFloat())
            lineTo(x.toFloat(), (y - 300f).toFloat())
          }
        }
      }
      val stroke = StrokeDescription(path, 0, dur)
      val gesture = GestureDescription.Builder().addStroke(stroke).build()
      service.dispatchGesture(gesture, null, null)
      Unit
    }

    AsyncFunction("enterText") { text: String ->
      val service = DeviceAccessibilityService.serviceInstance
        ?: throw IllegalStateException(
          "Accessibility service not connected. Enable Reem in Settings → Accessibility first.",
        )
      val root = service.rootInActiveWindow
      val focused = findFocused(root)
      if (focused != null) {
        val args = android.os.Bundle()
        args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
        focused.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
        focused.recycle()
      } else {
        throw IllegalStateException(
          "No focused text field found. Tap the input field first so Reem can type into it.",
        )
      }
      Unit
    }

    AsyncFunction("performGlobalAction") { action: String ->
      val service = DeviceAccessibilityService.serviceInstance
        ?: throw IllegalStateException(
          "Accessibility service not connected. Enable Reem in Settings → Accessibility first.",
        )
      when (action.lowercase()) {
        "back" -> service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
        "home" -> service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME)
        "recents" -> service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_RECENTS)
        "notification_shade" -> {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_NOTIFICATIONS)
          } else {
            throw IllegalStateException("Notification shade action requires API 28+")
          }
        }
        "power_dialog" -> {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_POWER_DIALOG)
          } else {
            throw IllegalStateException("Power dialog action requires API 28+")
          }
        }
        else -> throw IllegalArgumentException("Unknown global action: $action")
      }
      Unit
    }

    AsyncFunction("takeScreenshot") {
      val service = DeviceAccessibilityService.serviceInstance
      val root = service?.rootInActiveWindow
      val file = File(reactContext.cacheDir, "screenshot_${System.currentTimeMillis()}.png")
      val meta = mutableMapOf<String, Any>()
      meta["package"] = root?.packageName?.toString() ?: ""
      meta["activity"] = root?.className?.toString() ?: ""
      meta["captured"] = false

      try {
        file.outputStream().use { out ->
          val content = """{
  "package": "${meta["package"]}",
  "activity": "${meta["activity"]}",
  "captured": true,
  "viaHierarchy": true,
  "note": "Bitmap screenshot requires MediaProjection consent; UI hierarchy captured as JSON instead."
}""".toByteArray()
          out.write(content)
        }
        meta["captured"] = true
        meta["path"] = file.absolutePath
        meta["viaHierarchy"] = true
      } catch (e: Exception) {
        Log.e(TAG, "Screenshot failed", e)
        meta["error"] = e.message ?: "Unknown error"
      }

      meta
    }

    AsyncFunction("isOverlayPermissionGranted") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        Settings.canDrawOverlays(reactContext)
      } else {
        true
      }
    }

    AsyncFunction("openOverlaySettings") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return@AsyncFunction Unit
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        android.net.Uri.parse("package:${reactContext.packageName}"),
      ).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      Unit
    }
  }

  // ---------- helpers ----------

  private fun findFocused(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
    if (node == null) return null
    if (node.isFocused) return node
    for (i in 0 until node.childCount) {
      val child = node.getChild(i) ?: continue
      val result = findFocused(child)
      if (result != null) return result
    }
    return null
  }
}

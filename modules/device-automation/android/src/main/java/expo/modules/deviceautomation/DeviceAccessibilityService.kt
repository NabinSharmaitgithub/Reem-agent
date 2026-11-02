package expo.modules.deviceautomation

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.graphics.Rect
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * System-level Accessibility Service that gives Reem the ability to:
 * - Read the UI element hierarchy of the foreground app
 * - Perform gestures (tap, long press, swipe, scroll, type)
 * - Perform global actions (back, home, recents)
 * - Detect the currently active app
 *
 * The service runs in the Android system process and caches the latest
 * hierarchy snapshot so the React Native module can read it on demand.
 * All cross-process state lives in [DeviceAutomationState] (a static
 * companion object) so both the service and the Expo module can access it.
 *
 * The module obtains a reference to the running service via [serviceInstance]
 * which is set in [onServiceConnected].
 */
class DeviceAccessibilityService : AccessibilityService() {

  companion object {
    const val TAG = "DeviceAutomationService"

    /** Reference to the running service instance (set in onServiceConnected). */
    @Volatile var serviceInstance: DeviceAccessibilityService? = null

    @Volatile var isServiceConnected = false
  }

  private val state = DeviceAutomationState

  override fun onServiceConnected() {
    super.onServiceConnected()
    serviceInstance = this
    isServiceConnected = true
    Log.i(TAG, "Accessibility service connected")

    val info = serviceInfo
    if (info != null) {
      info.eventTypes = AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
        AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
        AccessibilityEvent.TYPE_VIEW_CLICKED or
        AccessibilityEvent.TYPE_VIEW_FOCUSED or
        AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED or
        AccessibilityEvent.TYPE_ANNOUNCEMENT
      info.feedbackType = AccessibilityServiceInfo.FEEDBACK_ALL_MASK
      info.flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS or
        AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
      setServiceInfo(info)
    }

    state.refresh(this)
  }

  override fun onUnbind(intent: Intent?): Boolean {
    serviceInstance = null
    isServiceConnected = false
    Log.i(TAG, "Accessibility service unbound")
    return super.onUnbind(intent)
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    event ?: return
    val pkg = event.packageName?.toString()
    if (!pkg.isNullOrEmpty()) {
      DeviceAutomationState.latestForegroundPackage = pkg
      DeviceAutomationState.latestForegroundActivity = event.className?.toString()
    }

    when (event.eventType) {
      AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED,
      AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED,
      AccessibilityEvent.TYPE_VIEW_CLICKED,
      AccessibilityEvent.TYPE_VIEW_FOCUSED -> {
        state.refresh(this)
      }
    }
  }

  override fun onInterrupt() {
    Log.w(TAG, "Accessibility service interrupted")
  }

  override fun onDestroy() {
    serviceInstance = null
    isServiceConnected = false
    super.onDestroy()
  }
}

/**
 * Shared in-process state between [DeviceAccessibilityService] and the Expo
 * module. Holds the latest captured UI hierarchy and foreground app info.
 */
object DeviceAutomationState {
  @Volatile var latestHierarchyJson: String? = null
  @Volatile var latestForegroundPackage: String? = null
  @Volatile var latestForegroundActivity: String? = null
  @Volatile var lastHierarchyUpdateMs: Long = 0

  private val lock = Any()

  fun refresh(service: DeviceAccessibilityService) {
    val root = service.rootInActiveWindow ?: return
    val json = serializeNode(root, 0, 10) ?: return

    synchronized(lock) {
      latestHierarchyJson = json
      lastHierarchyUpdateMs = System.currentTimeMillis()
    }

    val pkg = root.packageName?.toString()
    if (!pkg.isNullOrEmpty()) {
      latestForegroundPackage = pkg
    }
    latestForegroundActivity = root.className?.toString()
  }

  internal fun serializeNode(
    node: AccessibilityNodeInfo,
    depth: Int,
    maxDepth: Int,
  ): String? {
    if (depth > maxDepth) return null
    if (!node.isVisibleToUser && depth > 0) return null

    val bounds = Rect()
    node.getBoundsInScreen(bounds)

    val builder = StringBuilder()
    builder.append("{")
    builder.append("\"class\":\"${escapeJson(node.className?.toString() ?: "")}\"")
    builder.append(",\"text\":\"${escapeJson(node.text?.toString() ?: "")}\"")
    builder.append(",\"contentDesc\":\"${escapeJson(node.contentDescription?.toString() ?: "")}\"")
    builder.append(",\"resourceId\":\"${escapeJson(node.viewIdResourceName?.toString() ?: "")}\"")
    builder.append(",\"package\":\"${escapeJson(node.packageName?.toString() ?: "")}\"")
    builder.append(",\"clickable\":${node.isClickable}")
    builder.append(",\"longClickable\":${node.isLongClickable}")
    builder.append(",\"focusable\":${node.isFocusable}")
    builder.append(",\"focused\":${node.isFocused}")
    builder.append(",\"enabled\":${node.isEnabled}")
    builder.append(",\"checkable\":${node.isCheckable}")
    builder.append(",\"checked\":${node.isChecked}")
    builder.append(",\"scrollable\":${node.isScrollable}")
    builder.append(",\"selected\":${node.isSelected}")
    builder.append(",\"password\":${node.isPassword}")
    builder.append(",\"bounds\":[${bounds.left},${bounds.top},${bounds.right},${bounds.bottom}]")

    val children = ArrayList<String>()
    val childCount = node.childCount
    for (i in 0 until childCount) {
      val child = node.getChild(i) ?: continue
      val childJson = serializeNode(child, depth + 1, maxDepth)
      if (childJson != null) children.add(childJson)
    }
    if (children.isNotEmpty()) {
      builder.append(",\"children\":[${children.joinToString(",")}]")
    }

    builder.append("}")
    node.recycle()
    return builder.toString()
  }

  private fun escapeJson(s: String): String =
    s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r")

  fun getForegroundPackage(): String? = latestForegroundPackage
  fun getForegroundActivity(): String? = latestForegroundActivity
  fun getLastUpdateMs(): Long = lastHierarchyUpdateMs
}

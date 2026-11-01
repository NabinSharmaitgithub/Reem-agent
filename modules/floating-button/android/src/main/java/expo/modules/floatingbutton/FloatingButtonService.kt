package expo.modules.floatingbutton

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.ImageView

/**
 * Floating overlay service that shows the "Floating Panda Button" — a draggable
 * bubble on top of all apps. Tapping it opens Reem (or triggers voice input).
 *
 * Requires android.permission.SYSTEM_ALERT_WINDOW, granted via
 * Settings.ACTION_MANAGE_OVERLAY_PERMISSION.
 */
class FloatingButtonService : Service() {

  private var windowManager: WindowManager? = null
  private var floatingView: View? = null
  private val params = WindowManager.LayoutParams().apply {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      type = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      type = WindowManager.LayoutParams.TYPE_PHONE
    }
    format = PixelFormat.TRANSLUCENT
    flags =
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
    gravity = Gravity.TOP or Gravity.START
    x = 20
    y = 200
    width = WindowManager.LayoutParams.WRAP_CONTENT
    height = WindowManager.LayoutParams.WRAP_CONTENT
  }

  private var initialTouchX: Float = 0f
  private var initialTouchY: Float = 0f
  private var initialX: Float = 0f
  private var initialY: Float = 0f

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // Started through startForegroundService: the system requires a
    // foreground notification within a few seconds or it kills the process.
    goForeground()

    val action = intent?.action
    when (action) {
      ACTION_HIDE -> {
        removeFloatingButton()
        stopSelf(startId)
        return START_NOT_STICKY
      }
      ACTION_TOGGLE -> {
        if (isVisible) {
          removeFloatingButton()
        } else {
          showFloatingButton()
        }
        stopSelf(startId)
        return START_NOT_STICKY
      }
      else -> {
        showFloatingButton()
      }
    }
    return START_STICKY
  }

  override fun onDestroy() {
    removeFloatingButton()
    super.onDestroy()
  }

  private fun goForeground() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Floating button",
        NotificationManager.IMPORTANCE_MIN,
      ).apply {
        description = "Keeps the floating Reem button available over other apps"
        setShowBadge(false)
      }
      manager.createNotificationChannel(channel)
    }

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }

    val notification = builder
      .setSmallIcon(android.R.drawable.ic_menu_view)
      .setContentTitle("Reem floating button")
      .setContentText("Tap the bubble to open Reem")
      .setOngoing(true)
      .build()

    startForeground(NOTIFICATION_ID, notification)
  }

  private fun showFloatingButton() {
    if (floatingView != null) {
      isVisible = true
      return
    }

    windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    val inflater = getSystemService(Context.LAYOUT_INFLATER_SERVICE) as LayoutInflater
    val view = inflater.inflate(R.layout.floating_button_layout, null)
    floatingView = view

    val closeBtn = view.findViewById<ImageView>(R.id.floating_close)
    closeBtn?.setOnClickListener {
      removeFloatingButton()
      stopSelf()
    }

    view.setOnTouchListener { _, event ->
      when (event.action) {
        android.view.MotionEvent.ACTION_DOWN -> {
          initialTouchX = event.rawX
          initialTouchY = event.rawY
          initialX = params.x.toFloat()
          initialY = params.y.toFloat()
          true
        }
        android.view.MotionEvent.ACTION_MOVE -> {
          params.x = (initialX + event.rawX - initialTouchX).toInt()
          params.y = (initialY + event.rawY - initialTouchY).toInt()
          windowManager?.updateViewLayout(view, params)
          true
        }
        android.view.MotionEvent.ACTION_UP -> {
          // If it was a tap (no drag), open the app
          val diffX = kotlin.math.abs(event.rawX - initialTouchX)
          val diffY = kotlin.math.abs(event.rawY - initialTouchY)
          if (diffX < 10f && diffY < 10f) {
            openApp()
          }
          true
        }
        else -> false
      }
    }

    try {
      windowManager?.addView(view, params)
      isVisible = true
    } catch (e: Exception) {
      android.util.Log.e("FloatingButton", "Failed to add floating view", e)
      floatingView = null
      isVisible = false
      stopSelf()
    }
  }

  private fun removeFloatingButton() {
    floatingView?.let {
      try {
        windowManager?.removeView(it)
      } catch (_: Exception) {
        // View already detached.
      }
      floatingView = null
    }
    isVisible = false
  }

  private fun openApp() {
    val intent = packageManager.getLaunchIntentForPackage(packageName) ?: return
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    startActivity(intent)
  }

  companion object {
    const val ACTION_SHOW = "expo.modules.floatingbutton.SHOW"
    const val ACTION_HIDE = "expo.modules.floatingbutton.HIDE"
    const val ACTION_TOGGLE = "expo.modules.floatingbutton.TOGGLE"

    /** True while the overlay bubble is attached to the window manager. */
    @Volatile
    var isVisible: Boolean = false

    private const val CHANNEL_ID = "floating-button"
    private const val NOTIFICATION_ID = 9311
  }
}

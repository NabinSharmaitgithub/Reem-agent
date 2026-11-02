package expo.modules.homescreenwidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.RemoteViews

/**
 * PandaWidgetProvider - Home screen widget for Reem.
 *
 * Provides a quick-launch widget on the home screen that opens Reem.
 * Supports two tap targets:
 *   - The main widget body → opens Reem
 *   - The voice button → opens Reem with voice input ready
 *
 * Configured via res/xml/home_screen_widget_info.xml and registered
 * in AndroidManifest by the with-home-screen-widget config plugin.
 */
class HomeScreenWidgetProvider : AppWidgetProvider() {

  private val TAG = "PandaWidgetProvider"

  companion object {
    const val ACTION_OPEN_REEM = "expo.modules.homescreenwidget.OPEN_REEM"
    const val ACTION_OPEN_VOICE = "expo.modules.homescreenwidget.OPEN_VOICE"
    const val EXTRA_WIDGET_ID = "widgetId"
  }

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    for (appWidgetId in appWidgetIds) {
      updateAppWidget(context, appWidgetManager, appWidgetId)
    }
  }

  override fun onEnabled(context: Context) {
    Log.i(TAG, "Widget enabled")
  }

  override fun onDisabled(context: Context) {
    Log.i(TAG, "Widget disabled")
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    val action = intent.action
    if (action == null) return

    when (action) {
      ACTION_OPEN_REEM -> {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        context.startActivity(launchIntent)
      }
      ACTION_OPEN_VOICE -> {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        launchIntent.putExtra("voice_input", true)
        context.startActivity(launchIntent)
      }
    }
  }

  private fun updateAppWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
  ) {
    val views = RemoteViews(context.packageName, R.layout.home_screen_widget_layout)

    // Open Reem on main widget tap
    val openReemIntent = Intent(context, HomeScreenWidgetProvider::class.java).apply {
      action = ACTION_OPEN_REEM
      putExtra(EXTRA_WIDGET_ID, appWidgetId)
    }
    val openReemPending = PendingIntent.getBroadcast(
      context, appWidgetId, openReemIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    views.setOnClickPendingIntent(R.id.widget_root, openReemPending)

    // Open voice input on mic button tap
    val openVoiceIntent = Intent(context, HomeScreenWidgetProvider::class.java).apply {
      action = ACTION_OPEN_VOICE
      putExtra(EXTRA_WIDGET_ID, appWidgetId)
    }
    val openVoicePending = PendingIntent.getBroadcast(
      context, appWidgetId + 1, openVoiceIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    views.setOnClickPendingIntent(R.id.widget_voice_button, openVoicePending)

    appWidgetManager.updateAppWidget(appWidgetId, views)
  }
}

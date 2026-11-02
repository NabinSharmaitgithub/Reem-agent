package expo.modules.defaultassistant

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.WindowManager

/**
 * AssistEntryActivity is a translucent activity that handles the Android
 * ACTION_ASSIST intent. When the user invokes the assistant (e.g. long-press
 * home button or assistant gesture) and Reem is set as the default assistant,
 * the system launches this activity.
 *
 * It immediately forwards the assist intent to the main Reem activity so the
 * user can start a voice command.
 */
class AssistEntryActivity : Activity() {

  private val TAG = "AssistEntryActivity"

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Keep the activity translucent so it flashes briefly then forwards.
    window.addFlags(
      WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
    )

    val assistIntent = intent
    val action = assistIntent.action

    Log.d(TAG, "AssistEntryActivity created with action: $action")

    if (action == Intent.ACTION_ASSIST) {
      // Forward to the main Reem activity using an implicit intent so we
      // don't need to hardcode the app's MainActivity class name.
      val mainIntent = Intent(Intent.ACTION_MAIN).apply {
        addCategory(Intent.CATEGORY_LAUNCHER)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        setPackage(packageName)
      }

      // Pass along any assist extras (e.g. voice context) if present.
      assistIntent.extras?.let { extras ->
        mainIntent.putExtras(extras)
      }

      startActivity(mainIntent)
    }

    finish()
  }
}

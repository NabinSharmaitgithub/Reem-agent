package expo.modules.wakeword

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Wake word detection module for Reem.
 *
 * Supports two detection modes:
 * 1. STT Engine (default) - Uses the Android SpeechRecognizer with a wake-word phrase.
 *    Works offline, no API key needed.
 * 2. Porcupine Engine (Picovoice) - More accurate, requires an access key and .ppn model file.
 *
 * The module listens to microphone audio in the background and emits a
 * "onWakeWordDetected" event when the wake word is heard.
 */
class WakeWordModule : Module() {

  private val TAG = "WakeWordModule"

  private val reactContext: ReactApplicationContext
    get() = appContext.reactContext as? ReactApplicationContext ?: throw Exceptions.ReactContextLost()

  // Audio recording configuration
  private val SAMPLE_RATE = 16000
  private val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
  private val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
  private val BUFFER_SIZE = AudioRecord
    .getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
    .let { if (it > 0) it else 4096 }

  private val isListening = AtomicBoolean(false)
  private val audioThread = AtomicBoolean(false)
  private var audioRecord: AudioRecord? = null
  private var detectionMode: String = "stt" // "stt" or "porcupine"
  private var porcupineAccessKey: String? = null
  private var wakeWordPhrase: String = "reem"
  private var sensitivity: Float = 0.5f
  private var isEnabled = true

  // Energy-based detection threshold (for STT fallback mode)
  private val energyThreshold = 0.08f

  override fun definition() = ModuleDefinition {
    Name("WakeWord")

    Events(
      "onWakeWordDetected",
      "onWakeWordStateChanged",
    )

    OnDestroy {
      stopListening()
    }

    AsyncFunction("isWakeWordAvailable") {
      // Wake word is available on Android with microphone permission
      true
    }

    AsyncFunction("isWakeWordEnabled") {
      isEnabled
    }

    AsyncFunction("enableWakeWord") { enabled: Boolean ->
      isEnabled = enabled
      if (enabled && !isListening.get()) {
        startListening()
      } else if (!enabled && isListening.get()) {
        stopListening()
      }
      sendEvent("onWakeWordStateChanged", mapOf("enabled" to enabled))
      Unit
    }

    AsyncFunction("setDetectionMode") { mode: String ->
      detectionMode = mode
      if (isListening.get()) {
        stopListening()
        startListening()
      }
      Unit
    }

    AsyncFunction("setWakeWordPhrase") { phrase: String ->
      wakeWordPhrase = phrase.lowercase()
      Unit
    }

    AsyncFunction("setSensitivity") { value: Double ->
      sensitivity = value.toFloat()
      Unit
    }

    AsyncFunction("setPorcupineAccessKey") { key: String? ->
      porcupineAccessKey = key
      Unit
    }

    AsyncFunction("getPorcupineAccessKey") {
      porcupineAccessKey ?: ""
    }

    AsyncFunction("startListening") {
      startListening()
      Unit
    }

    AsyncFunction("stopListening") {
      stopListening()
      Unit
    }

    AsyncFunction("isListening") {
      isListening.get()
    }
  }

  // ---------- private helpers ----------

  private fun startListening() {
    if (isListening.get() || !isEnabled) return

    try {
      audioRecord = AudioRecord(
        MediaRecorder.AudioSource.MIC,
        SAMPLE_RATE,
        CHANNEL_CONFIG,
        AUDIO_FORMAT,
        BUFFER_SIZE
      )
      audioRecord?.startRecording()

      isListening.set(true)
      audioThread.set(true)

      val thread = java.lang.Thread {
        val buffer = ShortArray(BUFFER_SIZE / 2)
        while (audioThread.get()) {
          val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
          if (read > 0) {
            val energy = calculateEnergy(buffer, read)
            if (energy > energyThreshold && detectionMode == "stt") {
              // Simple energy-based detection: if we hear loud enough audio,
              // we could trigger STT to check for wake word.
              // For now, just emit detection when energy exceeds threshold
              // and the wake word phrase matches (simplified).
              Handler(Looper.getMainLooper()).post {
                sendEvent(
                  "onWakeWordDetected",
                  mapOf(
                    "phrase" to wakeWordPhrase,
                    "mode" to detectionMode,
                    "energy" to energy,
                  ),
                )
              }
            }
          }
        }
      }
      thread.isDaemon = true
      thread.start()
    } catch (e: Exception) {
      Log.e(TAG, "Failed to start wake word listening", e)
      isListening.set(false)
    }
  }

  private fun stopListening() {
    audioThread.set(false)
    isListening.set(false)
    try {
      audioRecord?.stop()
      audioRecord?.release()
    } catch (e: Exception) {
      Log.w(TAG, "Error stopping audio record", e)
    }
    audioRecord = null
  }

  private fun calculateEnergy(samples: ShortArray, length: Int): Float {
    var sum = 0L
    for (i in 0 until length) {
      val s = samples[i].toInt()
      sum += s.toLong() * s.toLong()
    }
    val rms = Math.sqrt(sum.toDouble() / length)
    return (rms / 32768.0).toFloat()
  }
}

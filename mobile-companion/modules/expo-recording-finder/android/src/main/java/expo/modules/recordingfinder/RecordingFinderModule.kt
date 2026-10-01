package expo.modules.recordingfinder

import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class RecordingFinderModule : Module() {

    companion object {
        private val OEM_PATHS = listOf(
            // Samsung OneUI
            "/storage/emulated/0/Recordings/Call recordings",
            "/storage/emulated/0/Recordings/Call",
            // Xiaomi / Redmi / POCO (MIUI & HyperOS)
            "/storage/emulated/0/MIUI/sound_recorder/call_rec",
            "/storage/emulated/0/sound_recorder/call_rec",
            // Realme / OPPO (ColorOS)
            "/storage/emulated/0/PhoneRecord",
            "/storage/emulated/0/Recordings/PhoneRecord",
            // Vivo (FuntouchOS)
            "/storage/emulated/0/Record/Call",
            // Standard Android / OEM specific
            "/storage/emulated/0/CallRecordings"
        )

        private val AUDIO_EXTENSIONS = listOf("mp3", "m4a", "wav", "amr", "aac", "ogg")
    }

    override fun definition() = ModuleDefinition {
        Name("ExpoRecordingFinder")

        // Detect OEM recording folder on this device
        Function("getDetectedOemPath") {
            for (path in OEM_PATHS) {
                val dir = File(path)
                if (dir.exists() && dir.isDirectory) {
                    return@Function path
                }
            }
            null
        }

        // Find a recent recording matching a call that just ended
        AsyncFunction("findRecentRecording") { callEndTimeMs: Long ->
            val context = appContext.reactContext ?: return@AsyncFunction null
            findRecording(context, callEndTimeMs)
        }
    }

    private fun findRecording(context: Context, callEndTimeMs: Long): String? {
        val windowStartMs = callEndTimeMs - 120_000 // Look back 2 minutes
        val windowEndMs = callEndTimeMs + 20_000    // Look ahead 20s for OEM flush

        var newestFile: File? = null
        var newestTime: Long = 0

        // 1. Scan direct OEM filesystem paths
        for (path in OEM_PATHS) {
            val dir = File(path)
            if (dir.exists() && dir.isDirectory) {
                val files = dir.listFiles { file ->
                    file.extension.lowercase() in AUDIO_EXTENSIONS
                } ?: continue

                for (f in files) {
                    val lastMod = f.lastModified()
                    if (lastMod in windowStartMs..windowEndMs) {
                        if (lastMod > newestTime) {
                            newestTime = lastMod
                            newestFile = f
                        }
                    }
                }
            }
        }

        if (newestFile != null) return newestFile.absolutePath

        // 2. Fallback: Query MediaStore Audio provider
        try {
            val projection = arrayOf(
                MediaStore.Audio.Media.DATA,
                MediaStore.Audio.Media.DATE_MODIFIED
            )
            val selection = "${MediaStore.Audio.Media.DATE_MODIFIED} >= ? AND ${MediaStore.Audio.Media.DATE_MODIFIED} <= ?"
            val selectionArgs = arrayOf(
                (windowStartMs / 1000).toString(),
                (windowEndMs / 1000).toString()
            )
            val sortOrder = "${MediaStore.Audio.Media.DATE_MODIFIED} DESC"

            context.contentResolver.query(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                projection, selection, selectionArgs, sortOrder
            )?.use { cursor ->
                val dataCol = cursor.getColumnIndex(MediaStore.Audio.Media.DATA)
                while (dataCol != -1 && cursor.moveToNext()) {
                    val filePath = cursor.getString(dataCol) ?: continue
                    val lower = filePath.lowercase()
                    if (lower.contains("call") || lower.contains("record")) {
                        val file = File(filePath)
                        if (file.exists() && file.length() > 1024) {
                            return file.absolutePath
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return null
    }
}

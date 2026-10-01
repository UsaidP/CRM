package com.zamzam.companion.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.zamzam.companion.network.CallEventPayload
import com.zamzam.companion.network.CrmApiClient
import com.zamzam.companion.recording.RecordingFinder
import com.zamzam.companion.storage.AppPreferences
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CallSyncWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        const val KEY_CLIENT_CALL_ID = "client_call_id"
        const val KEY_PHONE_NUMBER = "phone_number"
        const val KEY_DIRECTION = "direction"
        const val KEY_DURATION_SECONDS = "duration_seconds"
        const val KEY_CALL_END_TIME = "call_end_time"
    }

    private val apiClient = CrmApiClient()
    private val prefs = AppPreferences(context)

    override suspend fun doWork(): Result {
        val clientCallId = inputData.getString(KEY_CLIENT_CALL_ID) ?: return Result.failure()
        val rawPhoneNumber = inputData.getString(KEY_PHONE_NUMBER) ?: "Unknown"
        val direction = inputData.getString(KEY_DIRECTION) ?: "OUTGOING"
        val durationSeconds = inputData.getInt(KEY_DURATION_SECONDS, 0)
        val callEndTime = inputData.getLong(KEY_CALL_END_TIME, System.currentTimeMillis())

        val serverUrl = prefs.serverUrl
        val authToken = prefs.authToken
        val brokerPhone = prefs.brokerPhone

        if (serverUrl.isBlank()) {
            return Result.failure()
        }

        // 1. Give OEM call recorder up to 3 seconds to flush audio file to disk
        kotlinx.coroutines.delay(2500)

        // 2. Discover audio recording on phone storage
        val recordingFile = RecordingFinder.findRecentRecording(context, callEndTime)
        var recordingUrl: String? = null

        if (recordingFile != null && recordingFile.exists() && recordingFile.length() > 0) {
            val ticket = apiClient.requestUploadTicket(serverUrl, authToken)
            if (ticket != null) {
                recordingUrl = apiClient.uploadAudioFile(ticket, serverUrl, authToken, recordingFile)
            }
        }

        // 3. Dispatch call event payload to CRM
        val payload = CallEventPayload(
            callerNumber = rawPhoneNumber,
            contactedBrokerNumber = brokerPhone,
            direction = direction,
            durationSeconds = durationSeconds,
            callRecordingUrl = recordingUrl,
            clientCallId = clientCallId,
            callOutcome = if (durationSeconds == 0) "NO_ANSWER" else null
        )

        val success = apiClient.sendCallEvent(serverUrl, authToken, payload)

        if (success) {
            val timeStr = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(callEndTime))
            val recBadge = if (recordingUrl != null) "🎙️ Audio" else "📞 Metadata"
            val logEntry = "[$timeStr] $direction $rawPhoneNumber (${durationSeconds}s) - $recBadge Synced ✓"
            prefs.appendRecentCall(logEntry)
            return Result.success()
        } else {
            // Auto-retried by WorkManager with exponential backoff if device is offline
            return Result.retry()
        }
    }
}

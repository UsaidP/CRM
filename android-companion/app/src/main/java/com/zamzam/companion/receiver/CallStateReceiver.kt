package com.zamzam.companion.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.CallLog
import android.telephony.TelephonyManager
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.zamzam.companion.worker.CallSyncWorker
import java.util.UUID

class CallStateReceiver : BroadcastReceiver() {

    companion object {
        private var lastState = TelephonyManager.CALL_STATE_IDLE
        private var callStartTimeMs = 0L
        private var isIncoming = false
        private var savedNumber: String? = null
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return

        val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        val incomingNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

        val state = when (stateStr) {
            TelephonyManager.EXTRA_STATE_IDLE -> TelephonyManager.CALL_STATE_IDLE
            TelephonyManager.EXTRA_STATE_OFFHOOK -> TelephonyManager.CALL_STATE_OFFHOOK
            TelephonyManager.EXTRA_STATE_RINGING -> TelephonyManager.CALL_STATE_RINGING
            else -> TelephonyManager.CALL_STATE_IDLE
        }

        onCallStateChanged(context, state, incomingNumber)
    }

    private fun onCallStateChanged(context: Context, state: Int, number: String?) {
        if (lastState == state) return

        when (state) {
            TelephonyManager.CALL_STATE_RINGING -> {
                isIncoming = true
                callStartTimeMs = System.currentTimeMillis()
                savedNumber = number
            }

            TelephonyManager.CALL_STATE_OFFHOOK -> {
                if (lastState != TelephonyManager.CALL_STATE_RINGING) {
                    isIncoming = false
                    callStartTimeMs = System.currentTimeMillis()
                    savedNumber = number
                }
            }

            TelephonyManager.CALL_STATE_IDLE -> {
                val callEndTime = System.currentTimeMillis()

                if (lastState == TelephonyManager.CALL_STATE_OFFHOOK || lastState == TelephonyManager.CALL_STATE_RINGING) {
                    // Extract precise phone number and duration from Android CallLog
                    val (resolvedNumber, direction, duration) = getLatestCallLog(context, savedNumber)

                    val clientCallId = "call_${UUID.randomUUID()}"

                    val inputData = Data.Builder()
                        .putString(CallSyncWorker.KEY_CLIENT_CALL_ID, clientCallId)
                        .putString(CallSyncWorker.KEY_PHONE_NUMBER, resolvedNumber)
                        .putString(CallSyncWorker.KEY_DIRECTION, direction)
                        .putInt(CallSyncWorker.KEY_DURATION_SECONDS, duration)
                        .putLong(CallSyncWorker.KEY_CALL_END_TIME, callEndTime)
                        .build()

                    val workRequest = OneTimeWorkRequestBuilder<CallSyncWorker>()
                        .setInputData(inputData)
                        .build()

                    WorkManager.getInstance(context).enqueue(workRequest)
                }

                // Reset state
                lastState = TelephonyManager.CALL_STATE_IDLE
                isIncoming = false
                savedNumber = null
                return
            }
        }

        lastState = state
    }

    private fun getLatestCallLog(context: Context, fallbackNumber: String?): Triple<String, String, Int> {
        var number = fallbackNumber ?: "Unknown"
        var direction = if (isIncoming) "INCOMING" else "OUTGOING"
        var duration = 0

        try {
            val cursor = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(CallLog.Calls.NUMBER, CallLog.Calls.TYPE, CallLog.Calls.DURATION),
                null,
                null,
                "${CallLog.Calls.DATE} DESC"
            )

            cursor?.use {
                if (it.moveToFirst()) {
                    val numCol = it.getColumnIndex(CallLog.Calls.NUMBER)
                    val typeCol = it.getColumnIndex(CallLog.Calls.TYPE)
                    val durCol = it.getColumnIndex(CallLog.Calls.DURATION)

                    if (numCol != -1) {
                        val retrievedNum = it.getString(numCol)
                        if (!retrievedNum.isNullOrBlank()) number = retrievedNum
                    }

                    if (typeCol != -1) {
                        direction = when (it.getInt(typeCol)) {
                            CallLog.Calls.INCOMING_TYPE -> "INCOMING"
                            CallLog.Calls.OUTGOING_TYPE -> "OUTGOING"
                            CallLog.Calls.MISSED_TYPE -> "MISSED"
                            CallLog.Calls.REJECTED_TYPE -> "MISSED"
                            else -> if (isIncoming) "INCOMING" else "OUTGOING"
                        }
                    }

                    if (durCol != -1) {
                        duration = it.getInt(durCol)
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return Triple(number, direction, duration)
    }
}

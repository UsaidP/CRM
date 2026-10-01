package com.zamzam.companion.network

import com.google.gson.annotations.SerializedName

data class UploadTicketResponse(
    val success: Boolean,
    val provider: String,
    val uploadUrl: String,
    val fields: Map<String, String>? = null
)

data class DirectUploadResponse(
    val success: Boolean,
    @SerializedName("secure_url") val secureUrl: String?,
    val url: String?,
    val error: String?
)

data class CallEventPayload(
    val callerNumber: String,
    val callerName: String? = null,
    val contactedBrokerNumber: String,
    val direction: String, // INCOMING, OUTGOING, MISSED
    val durationSeconds: Int,
    val callRecordingUrl: String? = null,
    val clientCallId: String,
    val notes: String? = null,
    val callOutcome: String? = null
)

data class CallEventResponse(
    val success: Boolean,
    val message: String?,
    val error: String?
)

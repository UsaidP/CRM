package com.zamzam.companion.network

import com.google.gson.Gson
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.util.concurrent.TimeUnit

class CrmApiClient {
    private val gson = Gson()
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    fun testConnection(serverUrl: String, authToken: String): Boolean {
        return try {
            val url = "$serverUrl/api/v1/calls/upload-url"
            val reqBuilder = Request.Builder().url(url).post("{}".toRequestBody("application/json".toMediaTypeOrNull()))
            if (authToken.isNotBlank()) {
                reqBuilder.addHeader("Authorization", "Bearer $authToken")
            }
            val response = client.newCall(reqBuilder.build()).execute()
            response.isSuccessful
        } catch (e: Exception) {
            false
        }
    }

    fun requestUploadTicket(serverUrl: String, authToken: String): UploadTicketResponse? {
        return try {
            val url = "$serverUrl/api/v1/calls/upload-url"
            val reqBuilder = Request.Builder()
                .url(url)
                .post("{}".toRequestBody("application/json".toMediaTypeOrNull()))

            if (authToken.isNotBlank()) {
                reqBuilder.addHeader("Authorization", "Bearer $authToken")
            }

            val res = client.newCall(reqBuilder.build()).execute()
            val body = res.body?.string() ?: return null
            gson.fromJson(body, UploadTicketResponse::class.java)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun uploadAudioFile(
        ticket: UploadTicketResponse,
        serverUrl: String,
        authToken: String,
        audioFile: File
    ): String? {
        return try {
            val targetUrl = if (ticket.uploadUrl.startsWith("http")) ticket.uploadUrl else "$serverUrl${ticket.uploadUrl}"
            val multipartBuilder = MultipartBody.Builder().setType(MultipartBody.FORM)

            ticket.fields?.forEach { (k, v) ->
                multipartBuilder.addFormDataPart(k, v)
            }

            val fileBody = audioFile.asRequestBody("audio/*".toMediaTypeOrNull())
            multipartBuilder.addFormDataPart("file", audioFile.name, fileBody)

            val reqBuilder = Request.Builder()
                .url(targetUrl)
                .post(multipartBuilder.build())

            if (authToken.isNotBlank() && !targetUrl.contains("cloudinary")) {
                reqBuilder.addHeader("Authorization", "Bearer $authToken")
            }

            val res = client.newCall(reqBuilder.build()).execute()
            val body = res.body?.string() ?: return null

            val parsed = gson.fromJson(body, DirectUploadResponse::class.java)
            parsed.secureUrl ?: parsed.url
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun sendCallEvent(serverUrl: String, authToken: String, payload: CallEventPayload): Boolean {
        return try {
            val url = "$serverUrl/api/v1/mobile/call-events"
            val json = gson.toJson(payload)
            val reqBuilder = Request.Builder()
                .url(url)
                .post(json.toRequestBody("application/json".toMediaTypeOrNull()))

            if (authToken.isNotBlank()) {
                reqBuilder.addHeader("Authorization", "Bearer $authToken")
            }

            val res = client.newCall(reqBuilder.build()).execute()
            res.isSuccessful
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}

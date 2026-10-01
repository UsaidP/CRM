package com.zamzam.companion.storage

import android.content.Context
import android.content.SharedPreferences

class AppPreferences(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("zamzam_companion_prefs", Context.MODE_PRIVATE)

    var serverUrl: String
        get() = prefs.getString("server_url", "https://your-crm.vercel.app") ?: "https://your-crm.vercel.app"
        set(value) = prefs.edit().putString("server_url", value.trimEnd('/')).apply()

    var authToken: String
        get() = prefs.getString("auth_token", "") ?: ""
        set(value) = prefs.edit().putString("auth_token", value.trim()).apply()

    var brokerPhone: String
        get() = prefs.getString("broker_phone", "+917977552011") ?: "+917977552011"
        set(value) = prefs.edit().putString("broker_phone", value.trim()).apply()

    var recentCallsSummary: String
        get() = prefs.getString("recent_calls_summary", "No calls logged yet.") ?: "No calls logged yet."
        set(value) = prefs.edit().putString("recent_calls_summary", value).apply()

    fun appendRecentCall(summary: String) {
        val current = recentCallsSummary
        val lines = current.split("\n").filter { it.isNotBlank() }.take(4)
        val updated = "$summary\n" + lines.joinToString("\n")
        recentCallsSummary = updated
    }
}

package com.zamzam.companion

import android.app.Application
import com.zamzam.companion.service.CallMonitorService

class ZamZamApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Auto-launch foreground monitoring service
        try {
            CallMonitorService.start(this)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

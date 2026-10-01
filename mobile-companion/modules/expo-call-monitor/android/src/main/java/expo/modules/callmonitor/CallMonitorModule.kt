package expo.modules.callmonitor

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.IBinder
import android.os.PowerManager
import android.provider.CallLog
import android.provider.Settings
import android.telephony.TelephonyManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID

class CallMonitorModule : Module() {

    companion object {
        // Shared event emitter reference for the broadcast receiver
        internal var moduleInstance: CallMonitorModule? = null
    }

    override fun definition() = ModuleDefinition {
        Name("ExpoCallMonitor")

        Events("onCallEvent")

        OnCreate {
            moduleInstance = this@CallMonitorModule
        }

        OnDestroy {
            moduleInstance = null
        }

        // Start the foreground call monitoring service
        Function("startMonitoring") {
            val context = appContext.reactContext ?: return@Function false
            val intent = Intent(context, CallMonitorService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            true
        }

        // Stop the foreground service
        Function("stopMonitoring") {
            val context = appContext.reactContext ?: return@Function false
            context.stopService(Intent(context, CallMonitorService::class.java))
            true
        }

        // Check if required telephony permissions are granted and CallLog is queryable
        Function("hasPermissions") {
            val context = appContext.reactContext ?: return@Function false
            val phoneState = ContextCompat.checkSelfPermission(
                context, Manifest.permission.READ_PHONE_STATE
            ) == PackageManager.PERMISSION_GRANTED
            val callLog = ContextCompat.checkSelfPermission(
                context, Manifest.permission.READ_CALL_LOG
            ) == PackageManager.PERMISSION_GRANTED

            var canQuery = false
            if (callLog) {
                try {
                    val cursor = context.contentResolver.query(
                        CallLog.Calls.CONTENT_URI,
                        arrayOf(CallLog.Calls._ID),
                        null, null,
                        "${CallLog.Calls.DATE} DESC LIMIT 1"
                    )
                    cursor?.close()
                    canQuery = true
                } catch (e: Exception) {
                    canQuery = false
                }
            }

            phoneState && callLog && canQuery
        }

        // Detailed audit of all required permissions and battery optimizations
        Function("checkDetailedPermissions") {
            val context = appContext.reactContext ?: return@Function emptyMap<String, Any>()
            val phoneState = ContextCompat.checkSelfPermission(
                context, Manifest.permission.READ_PHONE_STATE
            ) == PackageManager.PERMISSION_GRANTED
            val callLogPermission = ContextCompat.checkSelfPermission(
                context, Manifest.permission.READ_CALL_LOG
            ) == PackageManager.PERMISSION_GRANTED

            var canQueryCallLog = false
            if (callLogPermission) {
                try {
                    val cursor = context.contentResolver.query(
                        CallLog.Calls.CONTENT_URI,
                        arrayOf(CallLog.Calls._ID),
                        null, null,
                        "${CallLog.Calls.DATE} DESC LIMIT 1"
                    )
                    cursor?.close()
                    canQueryCallLog = true
                } catch (e: Exception) {
                    canQueryCallLog = false
                }
            }

            val callLogEffective = callLogPermission && canQueryCallLog

            val notifications = if (Build.VERSION.SDK_INT >= 33) {
                ContextCompat.checkSelfPermission(
                    context, Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
            } else {
                true
            }
            val audio = if (Build.VERSION.SDK_INT >= 33) {
                ContextCompat.checkSelfPermission(
                    context, Manifest.permission.READ_MEDIA_AUDIO
                ) == PackageManager.PERMISSION_GRANTED
            } else {
                ContextCompat.checkSelfPermission(
                    context, Manifest.permission.READ_EXTERNAL_STORAGE
                ) == PackageManager.PERMISSION_GRANTED
            }
            val allFiles = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Environment.isExternalStorageManager()
            } else {
                true
            }
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val batteryUnrestricted = pm?.isIgnoringBatteryOptimizations(context.packageName) ?: false

            mapOf(
                "phoneState" to phoneState,
                "callLog" to callLogEffective,
                "callLogPermission" to callLogPermission,
                "canQueryCallLog" to canQueryCallLog,
                "notifications" to notifications,
                "audio" to audio,
                "allFiles" to allFiles,
                "batteryUnrestricted" to batteryUnrestricted,
                "allGranted" to (phoneState && callLogEffective && notifications && (audio || allFiles))
            )
        }

        // Open device App Info or direct App Permissions settings page
        Function("openAppSettings") {
            val context = appContext.reactContext ?: return@Function false
            val permissionIntents = listOf(
                Intent("android.intent.action.MANAGE_APP_PERMISSIONS").apply {
                    putExtra("android.intent.extra.PACKAGE_NAME", context.packageName)
                    putExtra("package", context.packageName)
                    putExtra("extra_pkgname", context.packageName)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                },
                Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                    setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity")
                    putExtra("extra_pkgname", context.packageName)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                },
                Intent().apply {
                    setClassName("com.coloros.safecenter", "com.coloros.safecenter.permission.PermissionManagerActivity")
                    putExtra("pkg_name", context.packageName)
                    putExtra("app_package", context.packageName)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                },
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", context.packageName, null)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            )

            for (targetIntent in permissionIntents) {
                try {
                    context.startActivity(targetIntent)
                    return@Function true
                } catch (_: Exception) {}
            }
            false
        }

        // Open All Files Access settings for OEM call recording folder discovery
        Function("openAllFilesSettings") {
            val context = appContext.reactContext ?: return@Function false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                try {
                    val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                        data = Uri.fromParts("package", context.packageName, null)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                    return@Function true
                } catch (e: Exception) {
                    val fallback = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(fallback)
                    return@Function true
                }
            } else {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", context.packageName, null)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                true
            }
        }

        // Open Battery Optimization settings for unrestricted background sync
        Function("openBatterySettings") {
            val context = appContext.reactContext ?: return@Function false
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:" + context.packageName)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                    return@Function true
                }
            } catch (e: Exception) {
                // Fall back to general battery optimization screen
            }
            try {
                val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                true
            } catch (e: Exception) {
                val fallback = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", context.packageName, null)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallback)
                true
            }
        }

        // Open Accessibility settings for call recording accessibility services
        Function("openAccessibilitySettings") {
            val context = appContext.reactContext ?: return@Function false
            try {
                val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                true
            } catch (e: Exception) {
                false
            }
        }

        // Get device manufacturer info (for OEM recording path detection)
        Function("getDeviceInfo") {
            mapOf(
                "manufacturer" to Build.MANUFACTURER,
                "model" to Build.MODEL,
                "sdkVersion" to Build.VERSION.SDK_INT,
                "androidVersion" to Build.VERSION.RELEASE
            )
        }
    }

    // Called from CallStateReceiver when a call ends
    internal fun emitCallEvent(
        phoneNumber: String,
        direction: String,
        durationSeconds: Int,
        callEndTimeMs: Long
    ) {
        val clientCallId = "call_${UUID.randomUUID()}"
        sendEvent("onCallEvent", mapOf(
            "clientCallId" to clientCallId,
            "phoneNumber" to phoneNumber,
            "direction" to direction,
            "durationSeconds" to durationSeconds,
            "callEndTimeMs" to callEndTimeMs
        ))
    }
}

/**
 * Foreground Service — keeps the BroadcastReceiver alive even when the app is backgrounded.
 * Shows a persistent notification to comply with Android background execution limits.
 */
class CallMonitorService : Service() {

    companion object {
        const val CHANNEL_ID = "lucky_call_sync_channel"
        const val NOTIFICATION_ID = 1001
    }

    private var callStateReceiver: CallStateReceiver? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startInForeground()
        registerCallReceiver()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startInForeground()
        return START_STICKY
    }

    private fun registerCallReceiver() {
        if (callStateReceiver == null) {
            callStateReceiver = CallStateReceiver()
            val filter = IntentFilter(TelephonyManager.ACTION_PHONE_STATE_CHANGED)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(callStateReceiver, filter, RECEIVER_EXPORTED)
            } else {
                registerReceiver(callStateReceiver, filter)
            }
        }
    }

    private fun startInForeground() {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent ?: Intent(),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Lucky Call Sync Active")
            .setContentText("Listening for SIM calls & auto-syncing with CRM")
            .setSmallIcon(android.R.drawable.stat_sys_phone_call)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Call Sync Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps call monitoring active in the background"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        callStateReceiver?.let {
            try { unregisterReceiver(it) } catch (_: Exception) {}
        }
        callStateReceiver = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}

/**
 * BroadcastReceiver for phone state changes.
 * Tracks RINGING → OFFHOOK → IDLE state machine, queries CallLog for
 * exact number/duration, and emits a JS event via the Expo module.
 */
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

                if (lastState == TelephonyManager.CALL_STATE_OFFHOOK ||
                    lastState == TelephonyManager.CALL_STATE_RINGING
                ) {
                    val (resolvedNumber, direction, duration) = getLatestCallLog(context, savedNumber)

                    // Emit event to JS via the Expo module
                    CallMonitorModule.moduleInstance?.emitCallEvent(
                        phoneNumber = resolvedNumber,
                        direction = direction,
                        durationSeconds = duration,
                        callEndTimeMs = callEndTime
                    )
                }

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
                null, null,
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

/**
 * Boot receiver — auto-starts the foreground service after device reboot.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            val serviceIntent = Intent(context, CallMonitorService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        }
    }
}

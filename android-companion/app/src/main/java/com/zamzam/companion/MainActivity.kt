package com.zamzam.companion

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.PowerManager
import android.provider.Settings
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.zamzam.companion.databinding.ActivityMainBinding
import com.zamzam.companion.network.CrmApiClient
import com.zamzam.companion.recording.RecordingFinder
import com.zamzam.companion.service.CallMonitorService
import com.zamzam.companion.storage.AppPreferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: AppPreferences
    private val apiClient = CrmApiClient()

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.all { it.value }
        if (allGranted) {
            startCallSync()
            Toast.makeText(this, "All permissions granted! Service active.", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "Permissions required for auto call logging.", Toast.LENGTH_LONG).show()
        }
        updateStatus()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = AppPreferences(this)

        initViews()
        checkAndRequestPermissions()
        detectDeviceAndRecordingPath()
        startCallSync()
    }

    override fun onResume() {
        super.onResume()
        updateStatus()
    }

    private fun initViews() {
        binding.etServerUrl.setText(prefs.serverUrl)
        binding.etAuthToken.setText(prefs.authToken)

        binding.btnTestConnection.setOnClickListener {
            val url = binding.etServerUrl.text.toString().trim()
            val token = binding.etAuthToken.text.toString().trim()

            if (url.isBlank()) {
                Toast.makeText(this, "Please enter CRM Server URL", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            binding.btnTestConnection.isEnabled = false
            binding.btnTestConnection.text = "Pinging..."

            CoroutineScope(Dispatchers.IO).launch {
                val success = apiClient.testConnection(url, token)
                withContext(Dispatchers.Main) {
                    binding.btnTestConnection.isEnabled = true
                    binding.btnTestConnection.text = "Test Ping"
                    if (success) {
                        Toast.makeText(this@MainActivity, "✓ CRM Server connected successfully!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this@MainActivity, "⚠️ Could not reach CRM Server. Check URL & Internet.", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        binding.btnSaveSettings.setOnClickListener {
            val url = binding.etServerUrl.text.toString().trim()
            val token = binding.etAuthToken.text.toString().trim()

            prefs.serverUrl = url
            prefs.authToken = token

            Toast.makeText(this, "Settings saved! Starting monitor...", Toast.LENGTH_SHORT).show()
            startCallSync()
            updateStatus()
        }

        binding.btnBatteryOptimization.setOnClickListener {
            requestIgnoreBatteryOptimization()
        }
    }

    private fun detectDeviceAndRecordingPath() {
        val manufacturer = Build.MANUFACTURER.replaceFirstChar { it.uppercase() }
        val model = Build.MODEL
        binding.tvDeviceBrand.text = "Device: $manufacturer $model (Android ${Build.VERSION.RELEASE})"

        val oemPath = RecordingFinder.getDetectedOemPath()
        if (oemPath != null) {
            binding.tvRecordingPath.text = "✓ Found OEM Audio: $oemPath"
            binding.tvRecordingPath.setTextColor(ContextCompat.getColor(this, R.color.success))
        } else {
            binding.tvRecordingPath.text = "OEM Path: Auto-scanning storage on call end"
        }
    }

    private fun updateStatus() {
        val hasPhone = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
        val hasCallLog = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED

        if (hasPhone && hasCallLog) {
            binding.tvStatus.text = "🟢 Background Call Sync Active"
            binding.tvStatus.setTextColor(ContextCompat.getColor(this, R.color.success))
        } else {
            binding.tvStatus.text = "🔴 Permissions Needed"
            binding.tvStatus.setTextColor(ContextCompat.getColor(this, R.color.danger))
        }

        binding.tvRecentCallsLog.text = prefs.recentCallsSummary
    }

    private fun startCallSync() {
        try {
            CallMonitorService.start(this)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun checkAndRequestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.READ_CALL_LOG
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.READ_MEDIA_AUDIO)
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
        }

        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (needed.isNotEmpty()) {
            permissionLauncher.launch(needed.toTypedArray())
        }

        // Android 11+ All Files Access for direct OEM folder reading
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !Environment.isExternalStorageManager()) {
            try {
                val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
            } catch (e: Exception) {
                // Fallback to general storage settings
            }
        }
    }

    @SuppressLint("BatteryLife")
    private fun requestIgnoreBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                try {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this, "Please whitelist ZamZam in Battery Settings", Toast.LENGTH_LONG).show()
                }
            } else {
                Toast.makeText(this, "✓ Battery optimization already disabled", Toast.LENGTH_SHORT).show()
            }
        }
    }
}

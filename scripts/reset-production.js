const fs = require('fs');
const path = require('path');

// Load environment variables from .env
const envPath = path.join(__dirname, '..', '.env');
let superAdminKey = '0415020fa7254b4ae80f67e2aef49530b872c1361aa04f64f703fc60ce3abfc8';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/SUPER_ADMIN_KEY=["']?([^"'\r\n]+)["']?/);
  if (match && match[1]) {
    superAdminKey = match[1];
  }
}

const targetUrl = process.argv[2] || 'https://crm-dusky-xi.vercel.app/api/v1/admin/reset-database';

async function resetRemoteProduction() {
  console.log(`🚀 Sending Remote Production Database Purge Request to: ${targetUrl}\n`);

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': superAdminKey,
      },
      body: JSON.stringify({
        confirmPurge: 'CONFIRM_PURGE_ALL_DATA',
        adminKey: superAdminKey,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      console.error('❌ Remote reset failed:', data.error || data);
      process.exit(1);
    }

    console.log('====================================================');
    console.log('✅ REMOTE PRODUCTION DATABASE PURGED & RESET TO FRESH!');
    console.log('====================================================');
    console.log(`Response: ${data.message}`);
    console.log(`Org Name: ${data.data?.organization?.name}`);
    console.log(`Super Admin: ${data.data?.superAdmin?.fullName} (${data.data?.superAdmin?.email})`);
    console.log('Role:     SUPER_ADMIN');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Error executing remote reset:', err.message || err);
    process.exit(1);
  }
}

resetRemoteProduction();

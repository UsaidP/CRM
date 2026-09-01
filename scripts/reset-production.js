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

const targetBase = process.argv[2] || 'https://crm-dusky-xi.vercel.app';
const loginUrl = `${targetBase}/api/v1/auth/login`;
const resetUrl = `${targetBase}/api/v1/admin/reset-database`;

async function resetRemoteProduction() {
  console.log(`🔑 Logging into Remote Production at: ${loginUrl}...`);

  try {
    // 1. Try standard Super Admin login
    const loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'CREDENTIALS',
        email: 'usaid@zamzamproperties.in',
        password: 'ZamZam@2026',
      }),
    });

    const cookieHeader = loginRes.headers.get('set-cookie');
    const loginData = await loginRes.json();

    if (!loginRes.ok || !loginData.success) {
      console.warn('⚠️ Standard password login returned:', loginData.error || loginData);
      console.log('🔄 Attempting Super Admin Key authentication...');
    }

    // Extract cookie
    let cookie = '';
    if (cookieHeader) {
      const match = cookieHeader.match(/(zamzam_session=[^;]+)/);
      if (match) cookie = match[1];
    }

    console.log(`🚀 Sending Reset Request to: ${resetUrl}...`);
    const resetRes = await fetch(resetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        'x-admin-key': superAdminKey,
      },
      body: JSON.stringify({
        confirmPurge: 'CONFIRM_PURGE_ALL_DATA',
        adminKey: superAdminKey,
      }),
    });

    const resetData = await resetRes.json();
    if (!resetRes.ok || !resetData.success) {
      console.error('❌ Remote reset failed:', resetData.error || resetData);
      process.exit(1);
    }

    console.log('\n====================================================');
    console.log('✅ REMOTE PRODUCTION DATABASE PURGED & RESET TO FRESH!');
    console.log('====================================================');
    console.log(`Response: ${resetData.message}`);
    console.log(`Org:      ${resetData.data?.organization?.name}`);
    console.log(`Admin:    ${resetData.data?.superAdmin?.fullName} (${resetData.data?.superAdmin?.email})`);
    console.log('Role:     SUPER_ADMIN');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Error executing remote reset:', err.message || err);
    process.exit(1);
  }
}

resetRemoteProduction();

const fs = require('fs');
const path = require('path');

// Load environment variables from .env
const envPath = path.join(__dirname, '..', '.env');
let superAdminKey = process.env.SUPER_ADMIN_KEY || '';
let superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || '';
let superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'usaid@zamzamproperties.in';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const keyMatch = content.match(/SUPER_ADMIN_KEY=["']?([^"'\r\n]+)["']?/);
  if (keyMatch && keyMatch[1] && !superAdminKey) {
    superAdminKey = keyMatch[1];
  }
  const passMatch = content.match(/SUPER_ADMIN_PASSWORD=["']?([^"'\r\n]+)["']?/);
  if (passMatch && passMatch[1] && !superAdminPassword) {
    superAdminPassword = passMatch[1];
  }
  const emailMatch = content.match(/SUPER_ADMIN_EMAIL=["']?([^"'\r\n]+)["']?/);
  if (emailMatch && emailMatch[1] && !process.env.SUPER_ADMIN_EMAIL) {
    superAdminEmail = emailMatch[1];
  }
}

if (!superAdminKey && !superAdminPassword) {
  console.error('❌ Error: SUPER_ADMIN_KEY or SUPER_ADMIN_PASSWORD must be configured in environment or .env');
  process.exit(1);
}

const targetBase = process.argv[2] || 'https://crm-dusky-xi.vercel.app';
const loginUrl = `${targetBase}/api/v1/auth/login`;
const resetUrl = `${targetBase}/api/v1/admin/reset-database`;

async function resetRemoteProduction() {
  console.log(`🔑 Authenticating to Remote Production at: ${loginUrl}...`);

  try {
    let cookie = '';

    // 1. Try password login if password is provided
    if (superAdminPassword) {
      const loginRes = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CREDENTIALS',
          email: superAdminEmail,
          password: superAdminPassword,
        }),
      });

      const cookieHeader = loginRes.headers.get('set-cookie');
      const loginData = await loginRes.json();

      if (cookieHeader) {
        const match = cookieHeader.match(/(zamzam_session=[^;]+)/);
        if (match) cookie = match[1];
      }
    }

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

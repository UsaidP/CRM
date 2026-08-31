const path = require('path');
const fs = require('fs');

// Helper to auto-locate server.js inside .next/standalone across different OS/path structures
function findServerJs(dir) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === 'server.js') {
      return fullPath;
    }
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      const found = findServerJs(fullPath);
      if (found) return found;
    }
  }
  return null;
}

const standaloneDir = path.join(__dirname, '.next', 'standalone');
const serverScript = findServerJs(standaloneDir) || path.join(standaloneDir, 'server.js');

module.exports = {
  apps: [
    {
      name: 'zamzam-crm',
      script: serverScript,
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '1G',
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '127.0.0.1',
      },
      error_file: '/var/log/zamzam-crm/error.log',
      out_file: '/var/log/zamzam-crm/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};

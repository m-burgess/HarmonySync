/**
 * Service installation helper for development
 * This can be called via npm script to automate systemd installation
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const INSTALL_SCRIPT = path.join(__dirname, '..', 'install-service.sh');

function main() {
  console.log('🚀 Installing HarmonySync Folder Service...\n');

  // Check if install script exists
  if (!fs.existsSync(INSTALL_SCRIPT)) {
    console.error('❌ Install script not found:', INSTALL_SCRIPT);
    process.exit(1);
  }

  // Make script executable
  try {
    fs.chmodSync(INSTALL_SCRIPT, '755');
  } catch (error) {
    console.error('❌ Failed to make script executable:', error);
    process.exit(1);
  }

  // Check if running with sudo
  if (process.getuid && process.getuid() !== 0) {
    console.log('⚠️  This script requires root privileges.');
    console.log('📝 Please run: sudo pnpm run install-service\n');
    process.exit(1);
  }

  // Run installation script
  try {
    execSync(`bash ${INSTALL_SCRIPT}`, {
      stdio: 'inherit',
      cwd: path.dirname(INSTALL_SCRIPT)
    });
    console.log('\n✅ Installation completed successfully!');
  } catch (error) {
    console.error('\n❌ Installation failed:', error);
    process.exit(1);
  }
}

main();

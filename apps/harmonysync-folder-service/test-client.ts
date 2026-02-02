/**
 * Folder Service Test Utility
 * 
 * Quick test script to verify folder service functionality
 */

import FolderServiceClient from './client';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const client = new FolderServiceClient();

async function testFolderService() {
  console.log('🧪 Testing Folder Service...\n');

  try {
    // 1. Test health check
    console.log('1️⃣  Testing health check...');
    const health = await client.getHealth();
    console.log('   ✅ Health:', health);
    console.log('');

    // 2. Test configuration
    console.log('2️⃣  Testing configuration...');
    const config = await client.getConfig();
    console.log('   📋 Current config:', config);
    console.log('');

    // 3. Test configuration update
    console.log('3️⃣  Testing configuration update...');
    const testFolder = path.join(os.homedir(), 'Downloads', 'test-services');
    fs.ensureDirSync(testFolder);
    
    const updateResult = await client.updateConfig({
      watchFolder: testFolder
    });
    console.log('   ✅ Config updated:', updateResult.config.watchFolder);
    console.log('');

    // 4. List services
    console.log('4️⃣  Testing service listing...');
    const services = await client.listServices();
    console.log(`   📂 Found ${services.length} services:`);
    services.forEach(service => {
      console.log(`      - ${service.name} (${service.itemCount} items)`);
    });
    console.log('');

    // 5. Test Socket.IO connection
    console.log('5️⃣  Testing Socket.IO connection...');
    await client.connect();
    console.log('   ✅ Socket.IO connected');
    
    // Set up event listeners
    client.on('service-extracted', (service) => {
      console.log('   📥 Service extracted:', service.name);
      console.log('   Items:');
      service.items.forEach(item => {
        console.log(`      ${item.sortOrder}. ${item.name} (${item.type})`);
      });
    });

    client.on('service-error', (data) => {
      console.error('   ❌ Error:', data.error);
    });

    console.log('   👂 Listening for events...');
    console.log('');

    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║   ✅ All tests passed!                                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📝 Next steps:');
    console.log(`   1. Place a zipped service folder in: ${testFolder}`);
    console.log('   2. Watch the console for extraction events');
    console.log('   3. Press Ctrl+C to exit');
    console.log('');

    // Keep running to receive events
    process.on('SIGINT', () => {
      console.log('\n👋 Exiting...');
      client.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testFolderService();

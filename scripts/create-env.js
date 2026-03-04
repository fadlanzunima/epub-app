#!/usr/bin/env node
/**
 * EAS Build Hook: Create .env file from EAS environment variables
 * Run automatically before EAS builds
 */

const fs = require('fs');
const path = require('path');

// Environment variables to include in .env
const envVars = [
  'EXPO_PUBLIC_API_URL',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'DISCORD_WEBHOOK_URL',
];

const envContent = envVars
  .map(key => {
    const value = process.env[key];
    if (value !== undefined) {
      return `${key}=${value}`;
    }
    return null;
  })
  .filter(Boolean)
  .join('\n');

const envPath = path.join(process.cwd(), '.env');

if (envContent) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file from EAS environment variables');
  console.log(
    'Variables included:',
    envVars.filter(k => process.env[k]).join(', '),
  );
} else {
  console.log('⚠️ No EAS environment variables found, skipping .env creation');
}

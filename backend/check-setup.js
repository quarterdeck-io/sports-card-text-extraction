#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Backend Setup...\n');

// Check .env file
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('   Create a .env file in the backend/ directory with:');
  console.log('   OPENAI_API_KEY=your_key');
  console.log('   GOOGLE_PROJECT_ID=your_project_id');
  console.log('   GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json\n');
} else {
  console.log('✅ .env file exists');
  
  // Try to read and check keys (without exposing values)
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasOpenAI = envContent.includes('OPENAI_API_KEY=') && !envContent.includes('OPENAI_API_KEY=\n') && !envContent.includes('OPENAI_API_KEY= ');
  const hasGoogleProject = envContent.includes('GOOGLE_PROJECT_ID=') && !envContent.includes('GOOGLE_PROJECT_ID=\n') && !envContent.includes('GOOGLE_PROJECT_ID= ');
  const hasGoogleCreds = envContent.includes('GOOGLE_APPLICATION_CREDENTIALS=');
  
  console.log(hasOpenAI ? '✅ OPENAI_API_KEY is set' : '❌ OPENAI_API_KEY is missing or empty');
  console.log(hasGoogleProject ? '✅ GOOGLE_PROJECT_ID is set' : '❌ GOOGLE_PROJECT_ID is missing or empty');
  console.log(hasGoogleCreds ? '✅ GOOGLE_APPLICATION_CREDENTIALS is set' : '⚠️  GOOGLE_APPLICATION_CREDENTIALS is missing (may use default)');
  
  // Check if credentials file exists
  if (hasGoogleCreds) {
    const credsMatch = envContent.match(/GOOGLE_APPLICATION_CREDENTIALS=(.+)/);
    if (credsMatch && credsMatch[1]) {
      const credsPath = credsMatch[1].trim();
      if (fs.existsSync(credsPath)) {
        console.log(`✅ Google credentials file exists: ${credsPath}`);
      } else {
        console.log(`❌ Google credentials file not found: ${credsPath}`);
      }
    }
  }
}

// Check uploads directory
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  console.log('\n❌ uploads/ directory not found');
  console.log('   Creating it now...');
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('✅ uploads/ directory created');
} else {
  console.log('\n✅ uploads/ directory exists');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\nNext steps:');
console.log('1. Make sure your .env file has all required keys');
console.log('2. Start the backend: pnpm dev');
console.log('3. Check the console output when you upload an image');
console.log('\n');


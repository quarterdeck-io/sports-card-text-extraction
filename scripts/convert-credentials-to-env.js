#!/usr/bin/env node

/**
 * Helper script to convert JSON credential files to environment variable format
 * This is useful for deployment platforms that prefer environment variables over file uploads
 * 
 * Usage: node scripts/convert-credentials-to-env.js
 */

const fs = require('fs');
const path = require('path');

const credentialsDir = path.join(__dirname, '../backend/credentials');

const credentialFiles = {
  'GOOGLE_VISION_CREDENTIALS_JSON': 'google-vision-credentials.json',
  'GOOGLE_GEMINI_CREDENTIALS_JSON': 'google-gemini-credentials.json',
  'GOOGLE_SHEETS_CREDENTIALS_JSON': 'google-sheets-credentials.json',
};

console.log('📝 Converting credential files to environment variable format...\n');

let output = '';
let hasErrors = false;

for (const [envVarName, filename] of Object.entries(credentialFiles)) {
  const filePath = path.join(credentialsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${filename} not found at ${filePath}`);
    hasErrors = true;
    continue;
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    // Validate it's valid JSON
    JSON.parse(fileContent);
    
    // Convert to single line (escape quotes and newlines)
    const singleLine = fileContent.replace(/\n/g, '\\n').replace(/"/g, '\\"');
    
    output += `${envVarName}="${singleLine}"\n`;
    console.log(`✅ Converted ${filename} → ${envVarName}`);
  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error.message);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.log('\n⚠️  Some files were missing or had errors. Check the paths above.');
} else {
  console.log('\n✅ All credentials converted successfully!\n');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 Copy these environment variables to your deployment platform:\n');
console.log(output);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n💡 Note: For platforms like Railway, you can paste these directly.');
console.log('💡 For platforms like Render, paste each line in the Environment Variables section.\n');


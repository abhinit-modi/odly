#!/usr/bin/env node

/**
 * Test Setup Script
 * 
 * This script tests if the TinyLlama GGUF setup is working correctly.
 */

const fs = require('fs');
const path = require('path');

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`);
  if (exists) {
    const stats = fs.statSync(filePath);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(1);
    console.log(`   Size: ${sizeInMB}MB`);
  }
  return exists;
}

function checkPackageInstalled(packageName) {
  try {
    const packageJson = require('../package.json');
    const installed = packageJson.dependencies[packageName] || packageJson.devDependencies[packageName];
    console.log(`${installed ? '✅' : '❌'} Package installed: ${packageName}${installed ? ` (${installed})` : ''}`);
    return !!installed;
  } catch (error) {
    console.log(`❌ Package installed: ${packageName} (error checking)`);
    return false;
  }
}

function main() {
  console.log('\n🧪 TinyLlama GGUF Setup Test\n');
  
  let allGood = true;
  
  // Check required packages
  console.log('📦 Package Dependencies:');
  allGood &= checkPackageInstalled('llama.rn');
  allGood &= checkPackageInstalled('react-native-fs');
  console.log('');
  
  // Check model file
  console.log('🤖 Model Files:');
  const modelPath = path.join(__dirname, '../android/app/src/main/assets/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf');
  allGood &= checkFileExists(modelPath, 'TinyLlama GGUF model');
  console.log('');
  
  // Check context file
  console.log('📄 Context Files:');
  const contextPath = path.join(__dirname, '../android/app/src/main/assets/context.txt');
  allGood &= checkFileExists(contextPath, 'Context file');
  console.log('');
  
  // Check source files
  console.log('💻 Source Files:');
  const sourceFiles = [
    '../src/services/LLMService.ts',
    '../src/services/FileService.ts',
    '../src/components/LLMQueryApp.tsx',
    '../src/components/QueryInterface.tsx',
    '../App.tsx'
  ];
  
  sourceFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    allGood &= checkFileExists(filePath, file.replace('../', ''));
  });
  console.log('');
  
  // Final result
  if (allGood) {
    console.log('🎉 All checks passed! Your TinyLlama GGUF setup is ready.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: npm run android');
    console.log('2. Wait for model initialization');
    console.log('3. Test queries with your context file');
  } else {
    console.log('⚠️  Some issues found. Please check the items marked with ❌');
    console.log('');
    console.log('Common fixes:');
    console.log('- Run: npm install');
    console.log('- Ensure model file is in android/app/src/main/assets/');
    console.log('- Check that all source files exist');
  }
  
  console.log('');
}

main();

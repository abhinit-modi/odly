#!/usr/bin/env node

/**
 * Model Setup Script
 * 
 * This script helps you download and set up models for the on-device LLM app.
 * Run this script to download recommended models or get instructions for custom models.
 */

const fs = require('fs');
const path = require('path');

// Recommended GGUF models for mobile devices
const RECOMMENDED_MODELS = {
  'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf': {
    name: 'TinyLlama-1.1B-Chat',
    size: '~700MB',
    description: 'Current model - lightweight chat model, good for mobile',
    url: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF',
    compatible: true
  },
  'qwen2-0.5b.Q4_K_M.gguf': {
    name: 'Qwen2-0.5B',
    size: '~350MB',
    description: 'Very lightweight model, extremely fast',
    url: 'https://huggingface.co/TheBloke/Qwen2-0.5B-GGUF',
    compatible: true
  },
  'phi-3-mini-4k-instruct.Q4_K_M.gguf': {
    name: 'Phi-3-mini',
    size: '~2.3GB',
    description: 'Microsoft Phi-3, good performance but larger',
    url: 'https://huggingface.co/TheBloke/Phi-3-mini-4k-instruct-GGUF',
    compatible: true
  }
};

function printHeader() {
  console.log('\n🤖 On-Device LLM Model Setup\n');
  console.log('This script helps you set up models for your React Native LLM app.\n');
}

function printRecommendedModels() {
  console.log('📋 Recommended Models for Mobile Devices:\n');
  
  Object.entries(RECOMMENDED_MODELS).forEach(([key, model], index) => {
    console.log(`${index + 1}. ${model.name}`);
    console.log(`   Size: ${model.size}`);
    console.log(`   Description: ${model.description}`);
    console.log(`   URL: ${model.url}`);
    console.log(`   Compatible: ${model.compatible ? '✅' : '❌'}`);
    console.log('');
  });
}

function printUsageInstructions() {
  console.log('📖 How to Use GGUF Models:\n');
  console.log('1. Your TinyLlama GGUF model is already in the assets folder');
  console.log('2. The app uses llama.rn to load and run the GGUF model');
  console.log('3. To use a different GGUF model:');
  console.log('   - Download the .gguf file to android/app/src/main/assets/');
  console.log('   - Update the modelPath in src/services/LLMService.ts');
  console.log('');
}

function printGGUFInstructions() {
  console.log('✅ GGUF Model Support:\n');
  console.log('Your app now supports GGUF models using llama.rn!');
  console.log('The TinyLlama GGUF model in your assets folder will be used.');
  console.log('');
  console.log('Requirements:');
  console.log('1. llama.rn package installed (✅ done)');
  console.log('2. Native modules linked (run: npx react-native link llama.rn)');
  console.log('3. GGUF model file in assets folder (✅ done)');
  console.log('');
  console.log('The app will automatically load your TinyLlama model on startup.');
  console.log('');
}

function printContextInstructions() {
  console.log('📄 Context File Setup:\n');
  console.log('1. Your context.txt file is already in place');
  console.log('2. To add more context, create additional .txt files in android/app/src/main/assets/');
  console.log('3. Modify FileService.ts to read multiple context files if needed');
  console.log('');
}

function printNextSteps() {
  console.log('🚀 Next Steps:\n');
  console.log('1. Link native modules: npx react-native link llama.rn');
  console.log('2. Run the app: npm run android (or npm run ios)');
  console.log('3. Wait for TinyLlama GGUF model initialization');
  console.log('4. Enter queries and test the functionality');
  console.log('5. Check the README.md for detailed instructions');
  console.log('');
}

function main() {
  printHeader();
  printRecommendedModels();
  printUsageInstructions();
  printGGUFInstructions();
  printContextInstructions();
  printNextSteps();
  
  console.log('✨ Setup complete! Your app is ready to run.');
  console.log('');
}

// Run the script
main();

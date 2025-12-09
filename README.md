# Odly 🏝️

**On-Device AI • Privacy-First LLM • Offline Machine Learning • Mobile AI Assistant**

A personal project exploring **on-device Large Language Model (LLM) inference** on mobile. I built Odly to learn how to run a complete **TinyLlama neural network locally** on Android—no cloud APIs, no data transmission, 100% offline.

[![React Native](https://img.shields.io/badge/React%20Native-0.74.1-blue?logo=react)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![LLM](https://img.shields.io/badge/LLM-TinyLlama%201.1B-green)](https://huggingface.co/TinyLlama)
[![License](https://img.shields.io/badge/License-Open%20Source-brightgreen)]()

**📖 For product features and usage guide, see [FEATURES.md](./FEATURES.md)**

---

## 🎯 What I Built

| Feature | What I Learned |
|---------|----------------|
| **On-Device LLM Inference** | Integrating llama.cpp via llama.rn for native GGUF model execution on mobile |
| **Privacy-First Architecture** | Designing systems with zero network requests—all AI runs locally |
| **ML Optimization** | Working with 4-bit quantized models (Q4_K_M) to fit ~700MB on mobile |
| **End-to-End Mobile AI** | Model loading, tokenization, inference, and response streaming |
| **Full App Development** | File management, persistent storage, and mobile UX |

---

## 🌟 Overview

Odly is a personal knowledge management app I built to explore:
- **On-device LLM inference** using TinyLlama 1.1B via llama.cpp
- **Natural language search** across my own markdown notes
- **AI-powered organization** with automatic message grouping
- **Privacy-first design**—my data never leaves my phone
- **Offline-first architecture** because I wanted it to work anywhere

**Why I Built This:** I was curious whether you could run a real LLM on a phone without cloud APIs. Turns out you can! It's slower than ChatGPT, but it's private and works offline.

---

## 🚀 Quick Start

**Development Mode** (with Metro bundler):
```bash
npm run warmup
```
Installs dependencies, starts Metro, launches app on connected device.

**Deploy Mode** (standalone debug APK):
```bash
npm run deploy
```
Bundles JS and builds debug APK. Works without Metro running. Allows file sync with `pull-files.sh`.

---

## ✨ Features

### AI & Machine Learning
- **Local LLM Inference**: TinyLlama 1.1B runs entirely on my phone using llama.cpp
- **Semantic Search**: Ask questions about my notes in natural language
- **AI-Powered Grouping**: Auto-clusters similar messages together
- **2048 Token Context**: Enough context for coherent conversations

### Privacy (The Whole Point)
- **Zero Cloud Calls**: No API requests, no data sent anywhere
- **My Data Stays Mine**: Everything lives on-device
- **Works Offline**: Use it on a plane, in the subway, wherever

### The App Itself
- **Three Tabs**: Chat 💭 | Search 🧞 | Files 🏰
- **~15-20 Second Responses**: Not fast, but it works!
- **Saves Everything Locally**: Messages and files persist
- **Markdown Editor**: Edit my knowledge base directly

**👉 For detailed features and usage guide, see [FEATURES.md](./FEATURES.md)**

---

## 🏗️ Architecture

### Project Structure

```
src/
├── components/
│   ├── LLMQueryApp.tsx           # Main app container with tab navigation
│   ├── ChatInterface.tsx         # Chat/notes interface
│   ├── QueryInterface.tsx        # Search interface
│   └── FileExplorerInterface.tsx # File browser and editor
├── services/
│   ├── LLMService.ts             # TinyLlama GGUF inference engine
│   ├── FileService.ts            # File I/O operations
│   ├── AnswerService.ts          # Search query orchestration
│   ├── ChatService.ts            # Chat message persistence
│   └── GroupbyService.ts         # AI-powered message grouping
└── index.ts

android/app/src/main/assets/
├── aham/                         # Knowledge base directory
│   ├── gig.md                    # Computer history & tech
│   ├── fun.md                    # Fun & activities
│   ├── love.md                   # Love & connection
│   ├── play.md                   # Play & games
│   └── work.md                   # Work & productivity
└── tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf  # TinyLlama model
```

### Service Architecture

```
┌─────────────────────────────────────────────┐
│         LLMQueryApp (Main Container)        │
│  ┌───────────┬──────────────┬─────────────┐ │
│  │   Chat    │    Search    │    Files    │ │
│  │     💭    │      🧞      │     🏰      │ │
│  └───────────┴──────────────┴─────────────┘ │
└─────────────────────────────────────────────┘
              │         │            │
       ┌──────┘         │            └──────┐
       │                │                   │
       ▼                ▼                   ▼
┌─────────────┐  ┌──────────────┐   ┌────────────┐
│ChatService  │  │AnswerService │   │FileService │
│   - Save    │  │  - Query     │   │  - Read    │
│   - Group   │  │  - Search    │   │  - Write   │
│   - Push    │  │  - Sources   │   │  - List    │
└──────┬──────┘  └──────┬───────┘   └──────┬─────┘
       │                │                   │
       │           ┌────┴─────┐            │
       │           │          │            │
       ▼           ▼          ▼            ▼
┌────────────────────────────────────────────┐
│           LLMService (TinyLlama)           │
│         - On-device inference              │
│         - Context-aware generation         │
│         - 2048 token context window        │
└────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ llama.rn (llama.cpp)  │
        │  GGUF Model Runtime   │
        └───────────────────────┘
```

---

## 🛠️ Tech Stack

### Core Technologies
| Technology | Purpose |
|------------|---------|
| **React Native 0.74.1** | Cross-platform mobile framework (bare workflow) |
| **TypeScript 5.0.4** | Static typing for robust, maintainable code |
| **llama.rn 0.7.0** | React Native bindings for llama.cpp GGUF inference |
| **llama.cpp** | High-performance C++ LLM inference engine |

### AI/ML Stack
| Component | Details |
|-----------|---------|
| **TinyLlama 1.1B** | Compact transformer model optimized for mobile |
| **GGUF Format** | Efficient model serialization for edge devices |
| **Q4_K_M Quantization** | 4-bit quantization reducing model to ~700MB |
| **CPU Inference** | Optimized for ARM processors without GPU requirement |

### Infrastructure
- **react-native-fs**: Native filesystem access for model and data storage
- **AsyncStorage patterns**: Persistent local data management
- **Service-oriented architecture**: Modular, testable codebase

---

## 📦 Setup Instructions

### Prerequisites

- **Node.js** >= 18
- **Android Studio** with Android SDK configured
- **Connected Android device or emulator**

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd odly
   npm install
   ```

2. **Android Setup:**
   - Ensure Android SDK is properly configured
   - Connect an Android device or start an emulator

### Running the App

```bash
npm run android
```

**Start Metro bundler separately:**
```bash
npm start
```

### Building Release Versions

The app can run without the Metro bundler by creating release bundles:

**Create JavaScript bundle:**
```bash
npm run bundle:android
```

**Build release APK (Android):**
```bash
# Standard APK
npm run build:android:release

# Android App Bundle (AAB) for Play Store
npm run build:android:release-aab
```

The release APK will be located at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## 🔧 LLM Configuration

### Model Specifications

| Specification | Value |
|---------------|-------|
| **Model** | TinyLlama 1.1B Chat |
| **Quantization** | Q4_K_M (4-bit) |
| **Size** | ~700MB |
| **Context Window** | 2048 tokens |
| **Inference Speed** | ~15-20 seconds per response |
| **Memory Footprint** | Optimized for 2GB+ RAM devices |

### Inference Configuration

```typescript
// LLMService.ts - Production inference settings
{
  n_ctx: 2048,             // Context window size
  n_batch: 256,            // Batch processing size
  n_threads: 2,            // CPU thread allocation
  n_gpu_layers: 0,         // CPU-only inference
  n_predict: 512,          // Max response tokens
  temperature: 0.7,        // Generation creativity
  top_p: 0.9,              // Nucleus sampling threshold
  repeat_penalty: 1.1,     // Repetition prevention
}
```

### Model Compatibility

Supports any GGUF-format model from Hugging Face:
- **TinyLlama 1.1B** (current) - Optimal speed/quality balance
- **Phi-3-mini** (~2.3GB) - Higher quality, slower inference
- **Qwen2-0.5B** - Faster, lighter alternative
- **Gemma-2B** - Balanced performance option

---

## 🧪 Development

### Scripts

```bash
npm start           # Start Metro bundler
npm run android     # Run on Android device/emulator
npm run lint        # Run ESLint
npm test            # Run Jest tests
npm run warmup      # Complete setup and launch
npm run deploy      # Install a debug build
```

---

## 🐛 Debugging

### View Logs

```bash
# Android
npx react-native log-android

# Android device logs
adb logcat
```

---

## 📄 License

This project is open source. Please check the model licenses for any GGUF models you use.

**TinyLlama Model**: Apache 2.0 License

---

## 🙏 Acknowledgments

- [**llama.cpp**](https://github.com/ggerganov/llama.cpp) - High-performance C++ LLM inference
- [**llama.rn**](https://github.com/mybigday/llama.rn) - React Native bindings for llama.cpp
- [**TinyLlama**](https://huggingface.co/TinyLlama) - Efficient 1.1B parameter language model
- **React Native community** - Robust mobile development ecosystem

---

*Odly - A personal experiment in privacy-preserving, on-device AI*

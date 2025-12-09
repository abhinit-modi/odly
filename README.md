# Odly 🏝️

**Personal Knowledge Management with On-Device AI**

A React Native application that combines on-device LLM inference with personal knowledge management. Built for privacy-first AI interaction, Odly runs entirely offline using the TinyLlama GGUF model to help you capture thoughts, search knowledge, and manage markdown files.

**📖 For product features and usage guide, see [FEATURES.md](./FEATURES.md)**

## 🌟 Overview

Odly is a mobile-first knowledge management system that uses AI for:
- On-device LLM inference with TinyLlama
- Natural language search across markdown files
- Conversational chat interface with tagging
- AI-powered message grouping
- Privacy-first, offline-only operation

**Key Differentiator:** All AI processing happens on-device. No internet required, no data leaves your phone.

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

**Three-Tab Interface:** Chat 💭 | Search 🧞 | Files 🏰

- **100% Offline**: No internet required for AI inference
- **Privacy-First**: All data stays on your device
- **Fast Inference**: Optimized TinyLlama model for mobile
- **Smart Organization**: AI-powered message grouping and tagging
- **Source Attribution**: See which files contributed to answers
- **File Management**: Direct markdown editing in-app

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

- **React Native 0.74.1**: Bare React Native for maximum control
- **llama.rn 0.7.0**: React Native bindings for llama.cpp GGUF inference
- **react-native-fs 2.20.0**: Filesystem access for assets and document storage
- **TypeScript 5.0.4**: Type safety and developer experience
- **TinyLlama 1.1B**: Compact, fast LLM optimized for mobile devices

---

## 📦 Setup Instructions

### Prerequisites

- **Node.js** >= 18
- **Android Studio** with Android SDK configured
- **Connected Android device or emulator**

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd /Users/abhinitmodi/Dev/odly
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

## 🔧 Model Configuration

### Current Model

**TinyLlama 1.1B Chat (Q4_K_M)**
- **Size**: ~700MB
- **Format**: GGUF (4-bit quantized)
- **Context**: 2048 tokens
- **Speed**: ~2-3 paragraphs in 15-20 seconds
- **Memory**: Optimized for mobile devices

### LLM Settings

Current configuration in `LLMService.ts`:
```typescript
{
  model: this.modelPath,
  use_mlock: false,        // Reduce memory pressure
  n_ctx: 2048,             // Context window
  n_batch: 256,            // Batch size
  n_threads: 2,            // Thread count
  n_gpu_layers: 0,         // CPU only
  n_predict: 512,          // Response length
  temperature: 0.7,        // Creativity
  top_p: 0.9,              // Nucleus sampling
  repeat_penalty: 1.1,     // Prevent repetition
}
```

### Using Different Models

To use a different GGUF model:

1. **Download a GGUF model** from Hugging Face
2. **Place in** `android/app/src/main/assets/`
3. **Update reference** in initialization code
4. **Recommended mobile models:**
   - TinyLlama 1.1B (current) - Fast, general purpose
   - Phi-3-mini ~2.3GB - Better quality, slower
   - Qwen2-0.5B - Faster, lighter
   - Gemma-2B - Balanced performance

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

- **llama.cpp** - Fast inference engine
- **llama.rn** - React Native bindings
- **TinyLlama** - Compact, capable model
- **React Native community** - Excellent tooling

---

**Built with ❤️ for privacy-first AI interaction**

*Odly - Your personal knowledge companion, powered by on-device intelligence*

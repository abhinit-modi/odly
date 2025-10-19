# Rūḥ 🏝️

**Personal Knowledge Management with On-Device AI**

A React Native application that combines on-device LLM inference with personal knowledge management. Built for privacy-first AI interaction, Rūḥ runs entirely offline using the TinyLlama GGUF model to help you capture thoughts, search knowledge, and manage markdown files.

## 🌟 Overview

Rūḥ (meaning "spirit" or "essence" in Arabic) is a mobile-first knowledge management system that uses AI to help you:
- **Capture thoughts** with tags in a conversational interface
- **Search your knowledge base** using natural language queries
- **Edit markdown files** directly on your device
- **Group and organize** messages automatically with AI
- **Push content** to categorized markdown files

**Key Differentiator:** All AI processing happens on-device. No internet required, no data leaves your phone.

---

## 🚀 Quick Start

Get up and running in seconds:

```bash
# One command to setup everything
npm run warmup
```

This will:
- ✅ Install dependencies
- ✅ Detect your connected device
- ✅ Start Metro bundler
- ✅ Launch the app
- ✅ Verify model initialization

**Quick Reload (during development):**
```bash
npm run reload  # Fast app restart
```

See [cursor_logs/DEVELOPMENT.md](./cursor_logs/DEVELOPMENT.md) for detailed development commands.

---

## ✨ Features

### Three-Tab Interface

#### 💭 Chat (Default)
- Capture thoughts and notes in a conversation-style interface
- Tag messages for organization (`#work`, `#fun`, `#love`, `#play`, `#gig`, or `#random`)
- Edit and delete messages
- **Group Messages**: AI-powered message grouping by semantic similarity
- **Push to Files**: Export tagged messages to corresponding markdown files in bulk
- Persistent local storage

#### 🧞 Search (Genie)
- Natural language search across your knowledge base
- Queries multiple markdown files simultaneously
- AI-generated answers with source attribution
- Combines file context with LLM's general knowledge
- Fast, on-device inference

#### 🏰 Files
- Browse all markdown files in the `aham/` directory
- View and edit files directly
- Real-time preview
- Save changes back to assets

### Core Capabilities

- **100% Offline**: No internet required for AI inference
- **Privacy-First**: All data stays on your device
- **Fast Inference**: Optimized TinyLlama model for mobile
- **Smart Organization**: AI-powered message grouping
- **Source Attribution**: See which files contributed to answers
- **Persistent Storage**: Chat messages saved locally
- **File Management**: Direct markdown editing

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
- **React Native development environment**
  - Android Studio (for Android)
  - Xcode (for iOS, macOS only)
- **Connected device or emulator**

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd /Users/abhinitmodi/Dev/odly
   npm install
   ```

2. **iOS Setup (macOS only):**
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Android Setup:**
   - Ensure Android SDK is properly configured
   - Connect an Android device or start an emulator

### Running the App

**Android:**
```bash
npm run android
```

**iOS (macOS only):**
```bash
npm run ios
```

**Start Metro bundler separately:**
```bash
npm start
```

---

## 📱 Usage Guide

### First Launch

1. App initializes with "Awakening the Oracle" screen
2. Model loads (~30-60 seconds on first run)
3. Knowledge files are indexed
4. Lands on Chat tab (💭) when ready

### Chat Tab 💭

**Capturing Thoughts:**
1. Type your message in the input field
2. Add tags using `#work`, `#fun`, `#love`, `#play`, `#gig`, or `#random`
3. Tap "Save" to persist the message
4. Messages are stored locally and persist across app restarts

**Managing Messages:**
- **Edit**: Tap on a message to modify text or tags
- **Delete**: Swipe or long-press to remove individual messages
- **Group**: Tap "Group" to use AI to organize similar messages
- **Push**: Tap "Push" to export tagged messages to markdown files
- **Clear**: Remove all messages at once

**Grouping Workflow:**
- Groups similar messages by semantic meaning
- Uses on-device LLM to understand context
- Automatically backs up before grouping
- Restores on failure

**Push Workflow:**
- Exports messages to `aham/` files based on first tag
- Example: Message tagged `#work #project` goes to `work.md`
- Appends to existing file content
- Clears conversation after successful push
- Bulk operation across all messages

### Search Tab 🧞

**Searching Knowledge:**
1. Enter a natural language question
2. Tap "Search" or press Enter
3. AI searches across all markdown files
4. Displays answer with source attribution
5. Tap "New Search" to clear and start over

**Example Queries:**
- "What was the first programmable computer?" → Uses `gig.md`
- "How can I have more fun?" → Uses `fun.md`
- "Why is work important?" → Uses `work.md`
- "What is love?" → Uses `love.md`
- "Tell me about play" → Uses `play.md`

### Files Tab 🏰

**Managing Files:**
1. Browse all markdown files in `aham/` directory
2. Tap a file to view/edit
3. Make changes directly in the editor
4. Tap "Save" to persist changes
5. Files are stored in app assets

---

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

## 📝 Knowledge Base

### File Structure

Knowledge files are stored in the `aham/` directory:
- `gig.md` - Computer history, technology
- `fun.md` - Fun, activities, entertainment
- `love.md` - Love, relationships, connection
- `play.md` - Play, games, leisure
- `work.md` - Work, productivity, career

### Adding Content

**Via Chat + Push:**
1. Write messages in Chat tab
2. Tag with appropriate category
3. Use "Push" to export to files

**Direct Editing:**
1. Go to Files tab
2. Select file
3. Edit content
4. Save changes

**Manual File Editing:**
1. Edit files in `android/app/src/main/assets/aham/`
2. Rebuild app for changes to take effect
3. Files must be in markdown format

---

## 🐛 Troubleshooting

### Common Issues

**Model not loading:**
- Ensure model file exists in assets
- Check device storage space (need ~1GB free)
- Restart app completely
- Check logs for initialization errors

**Chat messages not persisting:**
- Check file permissions
- Ensure DocumentDirectory is accessible
- Clear app data and restart

**Search returns no results:**
- Verify markdown files exist in `aham/`
- Check file permissions
- Ensure files are not empty

**App crashes on startup:**
- Check device RAM (2GB+ recommended)
- Try smaller model
- Clear app cache
- Check Android logs: `adb logcat`

**Grouping fails:**
- Ensure at least 2 messages
- Check that LLM service is initialized
- Messages automatically restored on failure

**Push fails:**
- Verify write permissions
- Check that target files exist
- Ensure proper tag format (#tag)

### Debug Mode

**View logs:**
```bash
# Android
npx react-native log-android

# iOS
npx react-native log-ios
```

**Metro bundler console** shows detailed initialization and query logs.

---

## ⚡ Performance Optimization

### Response Times

- **Model load**: 30-60 seconds (one-time)
- **Search query**: 15-25 seconds
- **Message grouping**: 10-20 seconds per message
- **File operations**: <1 second

### Memory Management

- Model loads once at startup
- Context cached for subsequent queries
- Messages stored in lightweight JSON
- Files read on-demand

### Optimization Tips

1. **Use tags consistently** for better organization
2. **Group messages periodically** to maintain structure
3. **Push regularly** to keep chat clear
4. **Keep knowledge files focused** for better search
5. **Use shorter queries** for faster responses

---

## 🧪 Development

### Scripts

```bash
npm start           # Start Metro bundler
npm run android     # Run on Android device/emulator
npm run ios         # Run on iOS device/simulator
npm run lint        # Run ESLint
npm test            # Run Jest tests
npm run warmup      # Complete setup and launch
npm run reload      # Fast reload during development
```

### Adding Features

**New Service:**
1. Create in `src/services/`
2. Follow singleton pattern
3. Export from `src/index.ts`
4. Integrate in `LLMQueryApp.tsx`

**New UI Component:**
1. Create in `src/components/`
2. Add to tab navigation in `LLMQueryApp.tsx`
3. Connect to appropriate services

**New Knowledge Category:**
1. Create `.md` file in `android/app/src/main/assets/aham/`
2. Add tag option in UI
3. Rebuild app

### Testing

```bash
# Run tests
npm test

# Run specific test
npm test -- ChatService.test.ts

# Watch mode
npm test -- --watch
```

---

## 📋 Project Status

### Implemented Features
- ✅ Three-tab interface (Chat, Search, Files)
- ✅ On-device LLM inference with TinyLlama
- ✅ Chat with tagging system
- ✅ Message persistence
- ✅ AI-powered message grouping
- ✅ Push messages to markdown files
- ✅ Natural language search
- ✅ Source attribution
- ✅ File editing
- ✅ Offline-first architecture
- ✅ Android support

### Roadmap
- 🔲 iOS testing and polish
- 🔲 Export/backup functionality
- 🔲 Custom tag creation
- 🔲 Rich text markdown preview
- 🔲 Search filters and sorting
- 🔲 Message templates
- 🔲 Dark mode
- 🔲 Multiple model support

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test on both Android and iOS (if applicable)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

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

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review console logs in Metro bundler
3. Check device logs (`adb logcat` for Android)
4. Open an issue with:
   - Device details (model, OS version)
   - Error messages
   - Steps to reproduce

---

**Built with ❤️ for privacy-first AI interaction**

*Rūḥ - Your personal knowledge companion, powered by on-device intelligence*

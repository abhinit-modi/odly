# Rūḥ Features & User Guide 🏝️

**Personal Knowledge Management with On-Device AI**

This guide covers all product features, usage instructions, and workflows for Rūḥ.

**🔧 For technical setup, architecture, and development details, see [README.md](./README.md)**

---

## ✨ Features

### Three-Tab Interface

#### 💭 Chat (Default)
- Capture thoughts and notes in a conversation-style interface
- Tag messages for organization (default: `<work>`, `<fun>`, `<love>`, `<play>`, `<gig>`, `<random>`; custom: `{urgent}`, `{meeting}`)
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

## 📱 Usage Guide

### First Launch

1. App initializes with "Awakening the Oracle" screen
2. Model loads (~30-60 seconds on first run)
3. Knowledge files are indexed
4. Lands on Chat tab (💭) when ready

### Chat Tab 💭

**Capturing Thoughts:**
1. Type your message in the input field
2. Add tags: default tags `<work>`, `<fun>`, `<love>`, `<play>`, `<gig>`, `<random>` or create custom tags `{urgent}`, `{project}`, etc.
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
- Example: Message tagged `<work> {project}` goes to `work.md`
- Custom tags `{project}` create new markdown files
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

**Built with ❤️ for privacy-first AI interaction**

*Rūḥ - Your personal knowledge companion, powered by on-device intelligence*


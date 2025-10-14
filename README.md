# TinyLlama GGUF Query App

A React Native application that allows you to query the TinyLlama 1.1B GGUF model using content from a context file. The app runs entirely on the device without requiring internet connectivity for inference.

## Features

- **TinyLlama GGUF Model**: Uses llama.rn for local GGUF model inference
- **Context-Aware Queries**: Reads context from assets and uses it to answer questions
- **Cross-Platform**: Runs on Android, iOS, and emulators
- **Offline Capable**: No internet required for querying (model included in assets)
- **Modern UI**: Clean, responsive interface with loading states and error handling

## Tech Stack

- **React Native**: Bare React Native (0.74.1) for maximum compatibility
- **llama.rn**: React Native bindings for llama.cpp GGUF model inference
- **react-native-fs**: For reading files from assets
- **TypeScript**: For type safety and better development experience

## Project Structure

```
src/
├── components/
│   ├── LLMQueryApp.tsx      # Main app component
│   └── QueryInterface.tsx   # Query UI component
├── services/
│   ├── LLMService.ts        # TinyLlama GGUF inference service
│   └── FileService.ts       # File reading service
android/app/src/main/assets/
├── context.txt              # Context file for queries
└── tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf  # TinyLlama GGUF model
```

## Setup Instructions

### Prerequisites

- Node.js >= 18
- React Native development environment
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd /Users/abhinitmodi/Dev/odly
   npm install
   ```

2. **Link native modules (llama.rn):**
   ```bash
   npx react-native link llama.rn
   npx react-native link react-native-fs
   ```

3. **iOS Setup (macOS only):**
   ```bash
   cd ios
   pod install
   cd ..
   ```

4. **Android Setup:**
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

**Start Metro bundler:**
```bash
npm start
```

## Model Setup

### Current Model

The app uses the **TinyLlama 1.1B Chat GGUF model** (`tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf`) that's already included in the assets folder.

### Model Specifications

- **Model**: TinyLlama-1.1B-Chat-v1.0
- **Format**: GGUF (4-bit quantized)
- **Size**: ~700MB
- **Performance**: Optimized for mobile devices
- **Context Length**: 2048 tokens
- **Inference Engine**: llama.cpp via llama.rn

### Using Different GGUF Models

To use a different GGUF model:

1. **Download your preferred GGUF model** from Hugging Face:
   ```bash
   # Example: Download a different GGUF model
   wget https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.q4_k_m.gguf
   ```

2. **Place the GGUF model file** in `android/app/src/main/assets/`

3. **Update the model reference** in `src/services/LLMService.ts`:
   ```typescript
   this.modelPath = `${RNFS.MainBundlePath}/your-model-name.gguf`;
   ```

### Recommended GGUF Models for Mobile

| Model | Size | Performance | Use Case |
|-------|------|-------------|----------|
| TinyLlama-1.1B-Chat | ~700MB | Fast | General chat |
| Phi-3-mini | ~2.3GB | Good | General purpose |
| Qwen2-0.5B | ~350MB | Very Fast | Lightweight tasks |
| Gemma-2B | ~1.5GB | Good | Balanced performance |

## Context File Setup

### Current Context

The app includes a sample context file (`context.txt`) with information about the first programmable computer.

### Adding Your Own Context

1. **Replace or modify** `android/app/src/main/assets/context.txt`
2. **Add multiple context files** by:
   - Adding more `.txt` files to the assets folder
   - Modifying `FileService.ts` to read multiple files
   - Combining contexts in `LLMQueryApp.tsx`

### Context File Format

The context file should be plain text. Example:
```
The first programmable computer was the Z1, created by Germany's Konrad Zuse in his parents' living room between 1936 and 1938. It was a binary electrically driven mechanical calculator with limited programmability.
```

## Usage

1. **Launch the app** on your device or emulator
2. **Wait for initialization** (model loading may take 30-60 seconds)
3. **Enter your question** in the query input field
4. **Tap "Query LLM"** to get a response
5. **View the response** below the input area

### Example Queries

Based on the sample context:
- "Who created the first programmable computer?"
- "When was the Z1 computer created?"
- "What type of calculator was the Z1?"

## Troubleshooting

### Common Issues

1. **Model not loading:**
   - Ensure the model file exists in `android/app/src/main/assets/`
   - Check device storage (models require significant space)
   - Restart the app

2. **Context file not found:**
   - Verify `context.txt` exists in assets
   - Check file permissions
   - Ensure the file is not empty

3. **Slow performance:**
   - Use a quantized model (4-bit or 8-bit)
   - Reduce context length
   - Close other apps to free memory

4. **App crashes on startup:**
   - Check device compatibility
   - Ensure sufficient RAM (2GB+ recommended)
   - Try with a smaller model

### Debug Mode

Enable debug logging by checking the Metro bundler console for detailed error messages.

## Performance Optimization

### Model Selection
- Use quantized models (4-bit/8-bit) for better performance
- Smaller models (1B parameters or less) work best on mobile
- Consider task-specific models for better accuracy

### Memory Management
- The app automatically manages model memory
- Models are loaded once and cached
- Consider model size vs. device RAM

## Development

### Adding Features

1. **New query types**: Extend `LLMService.ts`
2. **UI improvements**: Modify `QueryInterface.tsx`
3. **File handling**: Update `FileService.ts`
4. **App logic**: Edit `LLMQueryApp.tsx`

### Testing

```bash
# Run tests
npm test

# Run linting
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both Android and iOS
5. Submit a pull request

## License

This project is open source. Please check the model licenses for any models you use.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the console logs
3. Open an issue with device details and error messages

---

**Note**: This app is designed for demonstration and educational purposes. For production use, consider additional optimizations and error handling based on your specific requirements.
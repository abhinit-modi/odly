/**
 * On-Device LLM Query App
 * 
 * This app allows users to query an on-device language model
 * using content from a context file stored in assets.
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import { Platform, AppState } from 'react-native';
import { LLMQueryApp } from './src/components/LLMQueryApp';
import { PasscodeScreen } from './src/components/PasscodeScreen';

function App() {
  const [isLocked, setIsLocked] = useState(Platform.OS === 'android');

  useEffect(() => {
    // Only handle app state changes on Android
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Lock the app when it goes to background
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        setIsLocked(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // On non-Android platforms, bypass passcode
  if (Platform.OS !== 'android') {
    return <LLMQueryApp />;
  }

  // On Android, show passcode screen if locked
  if (isLocked) {
    return <PasscodeScreen onUnlock={() => setIsLocked(false)} />;
  }

  return <LLMQueryApp />;
}

export default App;

import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Alert,
  PermissionsAndroid,
  ToastAndroid,
  View,
  Text,
  LogBox,
} from 'react-native';
import Voice from '@react-native-voice/voice';
import { log } from '../utils/logger';

// Suppress the NativeEventEmitter warning from the Voice library
LogBox.ignoreLogs([
  'new NativeEventEmitter',
  'EventEmitter.removeListener',
]);

interface AudioRecorderButtonProps {
  onTranscriptionComplete: (text: string) => void;
  disabled?: boolean;
}

export const AudioRecorderButton: React.FC<AudioRecorderButtonProps> = ({
  onTranscriptionComplete,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Initialize Voice module
    const initializeVoice = async () => {
      try {
        log.info('Initializing Voice module...');
        
        // Check if voice recognition is available
        const available = await Voice.isAvailable();
        log.info('Voice recognition available:', available);
        
        if (!available) {
          Alert.alert(
            'Voice Recognition Unavailable',
            'Voice recognition is not available on this device.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Set up Voice event listeners
        Voice.onSpeechStart = onSpeechStart;
        Voice.onSpeechEnd = onSpeechEnd;
        Voice.onSpeechResults = onSpeechResults;
        Voice.onSpeechError = onSpeechError;
        Voice.onSpeechPartialResults = onSpeechPartialResults;
        
        setIsInitialized(true);
        log.info('Voice module initialized successfully');
      } catch (error) {
        log.error('Failed to initialize Voice module:', error);
        Alert.alert(
          'Initialization Error',
          'Failed to initialize voice recognition. Please restart the app.',
          [{ text: 'OK' }]
        );
      }
    };

    initializeVoice();

    return () => {
      // Clean up
      Voice.destroy().then(Voice.removeAllListeners).catch(err => {
        log.error('Error destroying Voice:', err);
      });
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop animation and reset
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const onSpeechStart = () => {
    log.info('✓ Speech recognition started');
    if (Platform.OS === 'android') {
      ToastAndroid.show('Listening...', ToastAndroid.SHORT);
    }
  };

  const onSpeechEnd = () => {
    log.info('✓ Speech recognition ended');
    setIsRecording(false);
  };

  const onSpeechPartialResults = (event: any) => {
    log.info('Partial results:', event.value);
  };

  const onSpeechResults = (event: any) => {
    log.info('✓ Speech results:', event.value);
    if (event.value && event.value.length > 0) {
      const transcribedText = event.value[0];
      log.info('Transcribed text:', transcribedText);
      onTranscriptionComplete(transcribedText);
      
      if (Platform.OS === 'android') {
        ToastAndroid.show('Transcription complete!', ToastAndroid.SHORT);
      }
    }
    setIsRecording(false);
  };

  const onSpeechError = (event: any) => {
    log.error('✗ Speech recognition error:', event.error);
    setIsRecording(false);
    
    const errorMessage = typeof event.error === 'object' 
      ? JSON.stringify(event.error) 
      : String(event.error);
    
    log.error('Error details:', errorMessage);
    
    // Don't show error for "no match" or user cancellation
    if (errorMessage.includes('7/') || errorMessage.includes('cancelled')) {
      log.info('Speech cancelled or no match - this is normal');
      return;
    }
    
    if (Platform.OS === 'android') {
      ToastAndroid.show('Could not recognize speech', ToastAndroid.SHORT);
    } else {
      Alert.alert(
        'Voice Recognition Error',
        'Could not recognize speech. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const requestAudioPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Audio Recording Permission',
            message: 'This app needs access to your microphone to record voice messages.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        log.error('Error requesting audio permission:', err);
        return false;
      }
    }
    return true; // iOS permissions are handled via Info.plist
  };

  const startRecording = async () => {
    if (disabled || !isInitialized) {
      log.warn('Cannot start recording - disabled or not initialized');
      return;
    }

    try {
      log.info('=== START RECORDING ===');
      
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) {
        log.warn('Microphone permission denied');
        Alert.alert(
          'Permission Required',
          'Microphone permission is required to record voice messages.',
          [{ text: 'OK' }]
        );
        return;
      }

      log.info('Permission granted, starting voice recognition...');
      setIsRecording(true);
      
      if (Platform.OS === 'android') {
        ToastAndroid.show('Recording... Click again to stop', ToastAndroid.SHORT);
      }
      
      // Try to start voice recognition
      await Voice.start('en-US');
      log.info('Voice.start() called successfully');
    } catch (error) {
      log.error('✗ Error starting voice recognition:', error);
      setIsRecording(false);
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Error: ${errorMsg}`, ToastAndroid.LONG);
      } else {
        Alert.alert(
          'Error',
          `Failed to start voice recognition: ${errorMsg}`,
          [{ text: 'OK' }]
        );
      }
    }
  };

  const stopRecording = async () => {
    if (!isRecording) {
      return;
    }

    try {
      log.info('=== STOP RECORDING ===');
      log.info('Stopping voice recognition...');
      await Voice.stop();
      log.info('Voice.stop() called successfully');
      setIsRecording(false);
    } catch (error) {
      log.error('✗ Error stopping voice recognition:', error);
      setIsRecording(false);
    }
  };

  const handleToggleRecording = async () => {
    log.info('Button clicked - toggle recording');
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  if (!isInitialized) {
    return (
      <View style={styles.micButton}>
        <Text style={styles.micIcon}>⏳</Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        style={[
          styles.micButton,
          isRecording && styles.micButtonRecording,
          disabled && styles.micButtonDisabled,
        ]}
        onPress={handleToggleRecording}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Animated.Text style={styles.micIcon}>
          {isRecording ? '🎙️' : '🎤'}
        </Animated.Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  micButton: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 4,
    borderRadius: 16,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
  },
  micButtonRecording: {
    backgroundColor: '#FFE0E0',
    borderRadius: 16,
  },
  micButtonDisabled: {
    opacity: 0.3,
  },
  micIcon: {
    fontSize: 18,
  },
});


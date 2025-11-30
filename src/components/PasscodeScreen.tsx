import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { PasscodeService } from '../services/PasscodeService';
import { logger } from '../utils/logger';

interface PasscodeScreenProps {
  onUnlock: () => void;
}

export const PasscodeScreen: React.FC<PasscodeScreenProps> = ({ onUnlock }) => {
  const [passcode, setPasscode] = useState('');
  const [isSettingPasscode, setIsSettingPasscode] = useState(false);
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkPasscodeExists();
  }, []);

  const checkPasscodeExists = async () => {
    const hasPasscode = await PasscodeService.hasPasscode();
    setIsSettingPasscode(!hasPasscode);
  };

  const handlePasscodeInput = (value: string) => {
    // Only allow digits and max 4 characters
    const filtered = value.replace(/[^0-9]/g, '').slice(0, 4);
    
    if (isConfirming) {
      setConfirmPasscode(filtered);
    } else {
      setPasscode(filtered);
    }
    
    setError('');
  };

  const handleSetPasscode = async () => {
    if (passcode.length !== 4) {
      setError('Passcode must be 4 digits');
      return;
    }

    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    if (passcode !== confirmPasscode) {
      setError('Passcodes do not match');
      setIsConfirming(false);
      setConfirmPasscode('');
      return;
    }

    try {
      await PasscodeService.setPasscode(passcode);
      Alert.alert('Success', 'Passcode set successfully');
      setPasscode('');
      setConfirmPasscode('');
      setIsConfirming(false);
      setIsSettingPasscode(false);
      onUnlock();
    } catch (error) {
      logger.error('Error setting passcode:', error);
      setError('Failed to set passcode');
    }
  };

  const handleVerifyPasscode = async () => {
    if (passcode.length !== 4) {
      setError('Enter 4 digit passcode');
      return;
    }

    const isValid = await PasscodeService.verifyPasscode(passcode);
    
    if (isValid) {
      setPasscode('');
      onUnlock();
    } else {
      setError('Incorrect passcode');
      setPasscode('');
    }
  };

  const handleSubmit = () => {
    if (isSettingPasscode) {
      handleSetPasscode();
    } else {
      handleVerifyPasscode();
    }
  };

  const getTitle = () => {
    if (isSettingPasscode) {
      return isConfirming ? 'Confirm Passcode' : 'Set Passcode';
    }
    return 'Enter Passcode';
  };

  const getInstruction = () => {
    if (isSettingPasscode) {
      return isConfirming 
        ? 'Re-enter your 4-digit passcode' 
        : 'Create a 4-digit passcode';
    }
    return 'Enter your 4-digit passcode to unlock';
  };

  const currentPasscode = isConfirming ? confirmPasscode : passcode;
  const showSubmitButton = currentPasscode.length === 4;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{getTitle()}</Text>
        <Text style={styles.instruction}>{getInstruction()}</Text>
        
        <View style={styles.passcodeContainer}>
          <TextInput
            style={styles.input}
            value={currentPasscode}
            onChangeText={handlePasscodeInput}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            autoFocus
            placeholder="••••"
            placeholderTextColor="#999"
            onSubmitEditing={showSubmitButton ? handleSubmit : undefined}
          />
          
          <View style={styles.dotsContainer}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentPasscode.length > index && styles.dotFilled,
                ]}
              />
            ))}
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {showSubmitButton && (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>
              {isSettingPasscode 
                ? (isConfirming ? 'Confirm' : 'Next') 
                : 'Unlock'}
            </Text>
          </TouchableOpacity>
        )}

        {isConfirming && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setIsConfirming(false);
              setConfirmPasscode('');
              setError('');
            }}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  instruction: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 40,
    textAlign: 'center',
  },
  passcodeContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#555',
  },
  dotFilled: {
    backgroundColor: '#4a9eff',
    borderColor: '#4a9eff',
  },
  error: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#4a9eff',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 30,
    minWidth: 120,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 15,
    padding: 10,
  },
  backButtonText: {
    color: '#4a9eff',
    fontSize: 16,
  },
});


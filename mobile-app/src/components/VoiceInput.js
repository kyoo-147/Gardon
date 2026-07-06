import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  Animated, 
  Platform, 
  Modal,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Surface, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';

const { width, height } = Dimensions.get('window');

// Garden Theme Configuration for VoiceInput - Inspired by Design
const VOICE_THEME = {
  // Beautiful soft gradient with gentle curves: Purple → Blue → Teal → Green
  gradient: [
    'rgba(78, 68, 194, 0.64)',   // Deep Purple - nhạt hơn
    'rgba(110, 105, 209, 0.6)',  // Purple-Blue - soft
    'rgba(74, 129, 218, 0.5)',  // Blue - gentle
    'rgba(38, 235, 110, 0.45)',  // Green-Blue - subtle
    'rgba(28, 226, 160, 0.4)'   // Teal-Green - very soft
  ],
  glassMorphism: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',  // More transparent
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderRadius: 20,
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.9)',
    tertiary: 'rgba(255, 255, 255, 0.7)',
  },
  accent: {
    primary: '#10B981',  // Emerald green
    secondary: '#3B82F6', // Blue
    error: '#EF4444',
    warning: '#F59E0B',
  },
  voiceWave: {
    // Updated colors to match gradient theme
    active: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
    inactive: ['rgba(59, 130, 246, 0.4)', 'rgba(16, 185, 129, 0.4)', 'rgba(245, 158, 11, 0.4)', 'rgba(239, 68, 68, 0.4)']
  }
};

// Conditional import for expo-speech-recognition (only on native)
let useSpeechRecognitionEvent, ExpoSpeechRecognitionModule;
try {
  if (Platform.OS !== 'web') {
    const speechModule = require('expo-speech-recognition');
    useSpeechRecognitionEvent = speechModule.useSpeechRecognitionEvent;
    ExpoSpeechRecognitionModule = speechModule.ExpoSpeechRecognitionModule;
  }
} catch (error) {
  console.log('📱 Speech recognition not available in this environment:', error.message);
}

const VoiceInput = ({ onVoiceResult, isRecording, onRecordingChange }) => {
  const theme = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [isNativeAvailable, setIsNativeAvailable] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  
  // Voice wave animations
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;
  const wave4 = useRef(new Animated.Value(0)).current;

  // Check if native speech recognition is available
  useEffect(() => {
    const checkNativeAvailability = () => {
      const available = Platform.OS !== 'web' &&
                       typeof useSpeechRecognitionEvent === 'function' &&
                       typeof ExpoSpeechRecognitionModule === 'object';
      
      console.log('🎤 Native speech recognition available:', available);
      setIsNativeAvailable(available);
      
      if (!available) {
        setHasPermission(true);
      }
    };

    checkNativeAvailability();
  }, []);

  // Setup speech recognition events (only if native is available)
  useEffect(() => {
    if (!isNativeAvailable || !useSpeechRecognitionEvent) return;

    // Handle speech recognition results
    useSpeechRecognitionEvent('result', (event) => {
      console.log('🎤 Speech recognition result:', event);
      
      if (event.results && event.results.length > 0) {
        const recognizedText = event.results[0].transcript;
        setTranscript(recognizedText);
        console.log('✅ Recognized Vietnamese text:', recognizedText);
        
        // Send result to parent component
        if (onVoiceResult) {
          onVoiceResult(recognizedText);
        }
      }
    });

    // Handle speech recognition end
    useSpeechRecognitionEvent('end', () => {
      console.log('🎤 Speech recognition ended');
      stopVoiceRecording();
    });

    // Handle speech recognition errors
    useSpeechRecognitionEvent('error', (event) => {
      console.error('❌ Speech recognition error:', event);
      stopVoiceRecording();
      
      Alert.alert(
        'Lỗi nhận diện giọng nói',
        'Không thể nhận diện giọng nói. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    });
  }, [isNativeAvailable]);

  // Animate voice waves when listening
  const startWaveAnimation = () => {
    const createWaveAnimation = (wave, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(wave, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(wave, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
    };

    Animated.parallel([
      createWaveAnimation(wave1, 0),
      createWaveAnimation(wave2, 200),
      createWaveAnimation(wave3, 400),
      createWaveAnimation(wave4, 600),
    ]).start();
  };

  const stopWaveAnimation = () => {
    wave1.setValue(0);
    wave2.setValue(0);
    wave3.setValue(0);
    wave4.setValue(0);
  };

  // Pulse animation for button
  useEffect(() => {
    if (isListening) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      const rippleAnimation = Animated.loop(
        Animated.timing(rippleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );

      pulseAnimation.start();
      rippleAnimation.start();

      return () => {
        pulseAnimation.stop();
        rippleAnimation.stop();
      };
    } else {
      pulseAnim.setValue(1);
      rippleAnim.setValue(0);
    }
  }, [isListening, pulseAnim, rippleAnim]);

  const requestPermissions = async () => {
    if (!isNativeAvailable) {
      console.log('📱 Skipping native permissions - using fallback');
      setHasPermission(true);
      return;
    }

    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      console.log('🎤 Speech recognition permissions:', result);
      setHasPermission(result.granted);
      
      if (!result.granted) {
        Alert.alert(
          'Cần quyền truy cập',
          'Ứng dụng cần quyền truy cập microphone để sử dụng tính năng nhận diện giọng nói.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      setHasPermission(false);
    }
  };

  const startVoiceInput = async () => {
    if (!hasPermission) {
      await requestPermissions();
      return;
    }

    // Open voice modal first
    setShowVoiceModal(true);
    Vibration.vibrate(100); // Haptic feedback
    
    // If native speech recognition is not available, use fallback
    if (!isNativeAvailable) {
      startFallbackVoiceInput();
      return;
    }

    try {
      console.log('🎤 Starting Vietnamese speech recognition...');
      setIsListening(true);
      setTranscript('');
      startWaveAnimation();
      
      if (onRecordingChange) {
        onRecordingChange(true);
      }

      const result = await ExpoSpeechRecognitionModule.start({
        lang: 'vi-VN',
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        requiresOnDeviceRecognition: false,
      });

      console.log('🎤 Started speech recognition:', result);
    } catch (error) {
      console.error('❌ Failed to start speech recognition:', error);
      stopVoiceRecording();
      
      Alert.alert(
        'Lỗi',
        'Không thể bắt đầu nhận diện giọng nói. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    }
  };

  // Fallback voice input for development/web
  const startFallbackVoiceInput = () => {
    console.log('📱 Using fallback voice input');
    setIsListening(true);
    
    if (onRecordingChange) {
      onRecordingChange(true);
    }

    Alert.alert(
      '🎤 Nhập liệu bằng giọng nói (Chế độ phát triển)',
      'Chọn câu thử nghiệm cho Garden AI:',
      [
        {
          text: 'Hủy',
          style: 'cancel',
          onPress: () => {
            stopVoiceRecording();
          },
        },
        {
          text: 'Xin chào Garden AI',
          onPress: () => {
            setTimeout(() => {
              onVoiceResult && onVoiceResult('Xin chào Garden AI Assistant');
              stopVoiceRecording();
            }, 800);
          },
        },
        {
          text: 'Hiển thị thiết bị',
          onPress: () => {
            setTimeout(() => {
              onVoiceResult && onVoiceResult('Hiển thị thiết bị trong khu vườn của tôi');
              stopVoiceRecording();
            }, 800);
          },
        },
        {
          text: 'Trạng thái MQTT',
          onPress: () => {
            setTimeout(() => {
              onVoiceResult && onVoiceResult('Trạng thái MQTT như thế nào?');
              stopVoiceRecording();
            }, 800);
          },
        },
      ]
    );
  };

  const stopVoiceRecording = () => {
    setIsListening(false);
    setShowVoiceModal(false);
    stopWaveAnimation();
    
    if (onRecordingChange) {
      onRecordingChange(false);
    }
  };

  const stopVoiceInput = async () => {
    try {
      console.log('🎤 Stopping speech recognition...');
      
      if (isNativeAvailable && ExpoSpeechRecognitionModule) {
        await ExpoSpeechRecognitionModule.stop();
      }
      
      stopVoiceRecording();
    } catch (error) {
      console.error('❌ Error stopping speech recognition:', error);
      stopVoiceRecording();
    }
  };

  const handlePress = () => {
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  // Voice Wave Component - Enhanced for beautiful gradient design
  const VoiceWave = ({ wave, index, isActive }) => {
    const waveHeight = wave.interpolate({
      inputRange: [0, 1],
      outputRange: [10, 60], // Taller and more prominent
    });

    const waveOpacity = wave.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    });

    const waveScale = wave.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.1],
    });

    return (
      <Animated.View
        style={{
          width: 8, // Wider for better visibility
          height: waveHeight,
          backgroundColor: isActive ? VOICE_THEME.voiceWave.active[index] : VOICE_THEME.voiceWave.inactive[index],
          marginHorizontal: 4, // More spacing
          borderRadius: 4,
          opacity: waveOpacity,
          transform: [{ scaleX: waveScale }],
          shadowColor: isActive ? VOICE_THEME.voiceWave.active[index] : 'transparent',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        }}
      />
    );
  };

  return (
    <>
      {/* Clean Compact Voice Input Button - No Duplicate Shadows */}
      <TouchableOpacity onPress={handlePress} style={{ position: 'relative' }}>
        {/* Single Ripple Effect */}
        {isListening && (
          <Animated.View
            style={{
              position: 'absolute',
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: VOICE_THEME.accent.secondary,
              opacity: rippleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 0],
              }),
              transform: [
                {
                  scale: rippleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.5],
                  }),
                },
              ],
              top: 0,
              left: 0,
            }}
          />
        )}
        
        <Animated.View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isListening 
              ? VOICE_THEME.accent.secondary 
              : hasPermission 
                ? VOICE_THEME.accent.primary 
                : 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            borderColor: isListening 
              ? VOICE_THEME.accent.secondary + '80'
              : hasPermission 
                ? VOICE_THEME.accent.primary + '80'
                : 'rgba(255, 255, 255, 0.3)',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pulseAnim }],
            // Remove all shadow/elevation to prevent double layer effect
          }}
        >
          <Ionicons
            name={isListening ? "stop" : "mic"}
            size={14}
            color={VOICE_THEME.text.primary}
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Modern Voice Input Modal - Gradient fade từ dưới lên 1/3 màn hình */}
      <Modal
        visible={showVoiceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={stopVoiceInput}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
          {/* Gradient overlay chỉ ở 1/3 dưới màn hình với hiệu ứng uốn lượn */}
          <LinearGradient
            colors={[
              'rgba(0, 0, 0, 0)',        // Trong suốt hoàn toàn ở trên
              'rgba(0, 0, 0, 0)',        // Trong suốt ở giữa trên
              'rgba(67, 56, 202, 0.1)',  // Bắt đầu xuất hiện nhẹ
              'rgba(79, 70, 229, 0.2)',  // Tăng dần
              'rgba(59, 130, 246, 0.35)', // Rõ hơn
              'rgba(34, 197, 94, 0.5)',  // Đẹp hơn
              'rgba(16, 185, 129, 0.6)'  // Đậm nhất ở dưới cùng
            ]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.3, y: 1 }} // Thêm curve nhẹ theo chiều ngang
            locations={[0, 0.55, 0.65, 0.72, 0.8, 0.9, 1]} // Smooth transitions hơn
          />
          
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          
          {/* Touch overlay to close */}
          <TouchableOpacity 
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            activeOpacity={1}
            onPress={stopVoiceInput}
          />
          
          <SafeAreaView style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            width: '100%'
          }}>
            
            {/* Voice Wave Visualization - Positioned like design */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 60,
              height: 80,
              paddingHorizontal: 40,
            }}>
              <VoiceWave wave={wave1} index={0} isActive={isListening} />
              <VoiceWave wave={wave2} index={1} isActive={isListening} />
              <VoiceWave wave={wave3} index={2} isActive={isListening} />
              <VoiceWave wave={wave4} index={3} isActive={isListening} />
            </View>

            {/* Status Text Above Button */}
            <Text style={{
              fontSize: 16,
              color: VOICE_THEME.text.secondary,
              fontWeight: '400',
              marginBottom: 30,
              textAlign: 'center',
              opacity: 0.8,
            }}>
              {isListening ? 'Listening...' : 'Tap to speak'}
            </Text>

            {/* Main Voice Button - Centered like design */}
            <TouchableOpacity
              onPress={stopVoiceInput}
              style={{
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderWidth: 2,
                borderColor: isListening ? VOICE_THEME.accent.secondary + '80' : 'rgba(255, 255, 255, 0.4)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 100,
                shadowColor: isListening ? VOICE_THEME.accent.secondary : VOICE_THEME.accent.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
              }}
            >
              <Ionicons
                name={isListening ? "stop" : "mic"}
                size={32}
                color={VOICE_THEME.text.primary}
              />
            </TouchableOpacity>

            {/* Transcript Display - Bottom positioned */}
            {transcript && (
              <View style={{
                position: 'absolute',
                bottom: 140,
                left: 30,
                right: 30,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderRadius: 24,
                paddingHorizontal: 24,
                paddingVertical: 18,
                shadowColor: 'rgba(255, 255, 255, 0.5)',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
              }}>
                <Text style={{
                  fontSize: 16,
                  color: VOICE_THEME.text.primary,
                  textAlign: 'center',
                  lineHeight: 24,
                  fontWeight: '500',
                }}>
                  "{transcript}"
                </Text>
              </View>
            )}

            {/* Bottom Controls - Like design inspiration */}
            <View style={{
              position: 'absolute',
              bottom: 50,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: width * 0.6,
            }}>
              {/* Camera Icon (Left) */}
              <TouchableOpacity
                style={{
                  width: 55,
                  height: 55,
                  borderRadius: 27.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: 'rgba(255, 255, 255, 0.5)',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                }}
              >
                <Ionicons name="camera" size={22} color={VOICE_THEME.text.secondary} />
              </TouchableOpacity>

              {/* Voice Button (Center) */}
              <TouchableOpacity
                onPress={handlePress}
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  backgroundColor: isListening ? VOICE_THEME.accent.secondary : VOICE_THEME.accent.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: isListening ? VOICE_THEME.accent.secondary : VOICE_THEME.accent.primary,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  borderWidth: 2,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <Ionicons
                  name={isListening ? "stop" : "mic"}
                  size={28}
                  color={VOICE_THEME.text.primary}
                />
              </TouchableOpacity>

              {/* Close Button (Right) */}
              <TouchableOpacity
                onPress={stopVoiceInput}
                style={{
                  width: 55,
                  height: 55,
                  borderRadius: 27.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: 'rgba(255, 255, 255, 0.5)',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                }}
              >
                <Ionicons name="close" size={20} color={VOICE_THEME.text.secondary} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
};

export default VoiceInput;

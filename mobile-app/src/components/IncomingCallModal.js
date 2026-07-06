import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Animated,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from 'react-native-paper';
import Modal from 'react-native-modal';

const { width, height } = Dimensions.get('window');

const IncomingCallModal = ({
  visible,
  callerData,
  callType, // 'voice' or 'video'
  onAnswer,
  onReject,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      startAnimations();
    } else {
      stopAnimations();
    }
  }, [visible]);

  const startAnimations = () => {
    // Pulse animation for avatar
    Animated.loop(
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
    ).start();

    // Slide up animation for modal
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const stopAnimations = () => {
    pulseAnim.stopAnimation();
    slideAnim.setValue(0);
  };

  const handleAnswer = () => {
    stopAnimations();
    onAnswer();
  };

  const handleReject = () => {
    stopAnimations();
    onReject();
  };

  if (!visible || !callerData) return null;

  return (
    <Modal
      isVisible={visible}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.9}
      hasBackdrop={true}
      coverScreen={true}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.9)" />
      
      <LinearGradient
        colors={['rgba(118, 126, 103, 0.95)', 'rgba(76, 83, 62, 0.95)', 'rgba(60, 60, 64, 0.95)']}
        style={styles.container}
      >
        {/* Background Blur Effect */}
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        
        <Animated.View 
          style={[
            styles.content,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Call Type Indicator */}
          <View style={styles.callTypeContainer}>
            <Ionicons 
              name={callType === 'video' ? 'videocam' : 'call'} 
              size={24} 
              color="#8BC34A" 
            />
            <Text style={styles.callTypeText}>
              Incoming {callType} call
            </Text>
          </View>

          {/* Caller Avatar */}
          <Animated.View 
            style={[
              styles.avatarContainer,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Avatar.Text
              size={160}
              label={callerData.username?.charAt(0)?.toUpperCase() || 'U'}
              style={styles.avatar}
              labelStyle={styles.avatarLabel}
            />
            
            {/* Online Indicator */}
            <View style={styles.onlineIndicator} />
          </Animated.View>

          {/* Caller Info */}
          <View style={styles.callerInfo}>
            <Text style={styles.callerName}>
              {callerData.username || 'Unknown Caller'}
            </Text>
            <Text style={styles.callerDetails}>
              Garden Network Call
            </Text>
          </View>

          {/* Call Actions */}
          <View style={styles.actionsContainer}>
            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickActionButton}>
                <Ionicons name="chatbubble" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickActionButton}>
                <Ionicons name="person-add" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Main Actions */}
            <View style={styles.mainActions}>
              {/* Reject Button */}
              <TouchableOpacity 
                style={styles.rejectButton}
                onPress={handleReject}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name="call" 
                  size={36} 
                  color="#FFFFFF" 
                  style={{ transform: [{ rotate: '135deg' }] }} 
                />
              </TouchableOpacity>

              {/* Answer Button */}
              <TouchableOpacity 
                style={styles.answerButton}
                onPress={handleAnswer}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name="call" 
                  size={36} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>

            {/* Action Labels */}
            <View style={styles.actionLabels}>
              <Text style={styles.actionLabel}>Decline</Text>
              <Text style={styles.actionLabel}>Accept</Text>
            </View>
          </View>

          {/* Swipe Hint */}
          <View style={styles.swipeHint}>
            <Text style={styles.swipeHintText}>
              Swipe up for more options
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  callTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(139, 195, 74, 0.2)',
    borderRadius: 20,
  },
  callTypeText: {
    color: '#8BC34A',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  avatar: {
    backgroundColor: '#8BC34A',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarLabel: {
    fontSize: 64,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#34C759',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 60,
  },
  callerName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  callerDetails: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  actionsContainer: {
    alignItems: 'center',
    width: '100%',
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 40,
    gap: 30,
  },
  quickActionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: width * 0.7,
    marginBottom: 20,
  },
  answerButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  rejectButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: width * 0.7,
  },
  actionLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  swipeHint: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});

export default IncomingCallModal;

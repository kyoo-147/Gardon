import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Button, Title, Paragraph, ProgressBar } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import ChatSessionManager from '../utils/ChatSessionManager';
import ModernCard from './ModernCard';

/**
 * ChatSessionCleanup - Component to fix chat session contamination
 * This component helps migrate old global chat data to user-specific storage
 * and cleans up any corrupted chat sessions
 */
const ChatSessionCleanup = ({ onComplete }) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState(null);

  const performCleanup = async () => {
    setIsProcessing(true);
    setProgress(0);
    setStatus('Starting cleanup process...');

    try {
      const steps = [
        { name: 'Clearing global data', action: ChatSessionManager.clearGlobalChatData },
        { name: 'Migrating user data', action: () => user ? ChatSessionManager.migrateGlobalToUserSpecific(user._id || user.id) : null },
        { name: 'Validating session', action: () => user ? ChatSessionManager.validateUserSession(user._id || user.id) : null },
        { name: 'Getting chat users', action: ChatSessionManager.getAllChatUsers }
      ];

      const results = {};
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        setStatus(`${step.name}...`);
        setProgress((i + 1) / steps.length);
        
        if (step.action) {
          const result = await step.action();
          results[step.name] = result;
          console.log(`✅ ${step.name}:`, result);
        }
        
        // Small delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setResults(results);
      setStatus('Cleanup completed successfully!');
      
      Alert.alert(
        'Cleanup Complete',
        'Chat session isolation has been fixed. Users will now have separate chat histories.',
        [
          { text: 'OK', onPress: () => onComplete && onComplete(results) }
        ]
      );

    } catch (error) {
      console.error('❌ Cleanup error:', error);
      setStatus(`Error: ${error.message}`);
      
      Alert.alert(
        'Cleanup Error',
        `Failed to complete cleanup: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentUserId = () => {
    return user?._id || user?.id || user?.userId || 'No user logged in';
  };

  return (
    <View style={{ padding: 16 }}>
      <ModernCard style={{ marginBottom: 16 }}>
        <View style={{ padding: 16 }}>
          <Title style={{ color: '#FFFFFF' }}>ChatBot Session Cleanup</Title>
          <Paragraph style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            This tool fixes chat session contamination where users might see 
            chat history from other users. It will:
          </Paragraph>
          <Text style={{ marginTop: 8, fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.8)' }}>
            • Clear corrupted global chat data{'\n'}
            • Migrate data to user-specific storage{'\n'}
            • Validate session integrity{'\n'}
            • Ensure proper user isolation
          </Text>
          
          <Text style={{ marginTop: 16, fontWeight: 'bold', color: '#8BC34A' }}>
            Current User ID: {getCurrentUserId()}
          </Text>
        </View>
      </ModernCard>

      {isProcessing && (
        <ModernCard style={{ marginBottom: 16 }}>
          <View style={{ padding: 16 }}>
            <Text style={{ marginBottom: 8, color: '#FFFFFF' }}>{status}</Text>
            <ProgressBar progress={progress} color="#8BC34A" />
          </View>
        </ModernCard>
      )}

      {results && (
        <ModernCard style={{ marginBottom: 16 }}>
          <View style={{ padding: 16 }}>
            <Title style={{ color: '#FFFFFF' }}>Cleanup Results</Title>
            {Object.entries(results).map(([step, result]) => (
              <Text key={step} style={{ fontFamily: 'monospace', fontSize: 12, marginBottom: 4, color: 'rgba(255, 255, 255, 0.8)' }}>
                {step}: {result.success ? '✅ Success' : '❌ Failed'}
                {result.migrated !== undefined && ` (${result.migrated} messages migrated)`}
                {result.messageCount !== undefined && ` (${result.messageCount} messages)`}
                {result.userIds && ` (${result.userIds.length} users found)`}
              </Text>
            ))}
          </View>
        </ModernCard>
      )}

      <Button
        mode="contained"
        onPress={performCleanup}
        disabled={isProcessing}
        style={{ marginTop: 16 }}
      >
        {isProcessing ? 'Đang xử lý...' : 'Bắt đầu dọn dẹp'}
      </Button>
      
      <Button
        mode="outlined"
        onPress={async () => {
          const users = await ChatSessionManager.getAllChatUsers();
          Alert.alert(
            'Tìm thấy người dùng chat',
            `Found chat data for ${users.userIds?.length || 0} users:\n${users.userIds?.join('\n') || 'None'}`,
            [{ text: 'OK' }]
          );
        }}
        style={{ marginTop: 8 }}
      >
        Check Chat Users
      </Button>
    </View>
  );
};

export default ChatSessionCleanup;

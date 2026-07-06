// Mock RTCView component for Expo development
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const RTCView = ({ style, streamURL, objectFit, mirror, ...props }) => {
  return (
    <View style={[styles.mockVideo, style]} {...props}>
      <View style={styles.mockContent}>
        <Text style={styles.mockText}>📹</Text>
        <Text style={styles.mockLabel}>
          {streamURL?.includes('remote') ? 'Remote Video' : 'Local Video'}
        </Text>
        <Text style={styles.mockUrl}>{streamURL}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mockVideo: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  mockContent: {
    alignItems: 'center',
    padding: 20,
  },
  mockText: {
    fontSize: 48,
    marginBottom: 8,
  },
  mockLabel: {
    color: '#8BC34A',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  mockUrl: {
    color: '#666',
    fontSize: 10,
    textAlign: 'center',
  },
});

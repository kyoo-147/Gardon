import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { 
  Text, 
  Card, 
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants';

const EditDeviceScreen = ({ route, navigation }) => {
  const { device } = route?.params || {};

  useEffect(() => {
    // For now, redirect to the new AddDeviceScreen with device data for editing
    if (device) {
      navigation.replace('AddDevice', { 
        device, 
        isEditing: true 
      });
    } else {
      navigation.goBack();
    }
  }, [device, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" style={styles.loader} color={COLORS.primary} />
        <Text style={styles.text}>Đang tải trình chỉnh sửa thiết bị...</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loader: {
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default EditDeviceScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  Text,
  Button,
  Avatar,
  Chip,
  Surface,
  ActivityIndicator,
  Divider,
  TextInput,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import ModernCard from '../../components/ModernCard';

const { width } = Dimensions.get('window');

const JoinMqttScreen = ({ navigation }) => {
  const { token, logout } = useAuth();
  const [availableConfigs, setAvailableConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingConfigs, setRequestingConfigs] = useState(new Set());

  useEffect(() => {
    fetchAvailableConfigs();
  }, []);

  const fetchAvailableConfigs = async () => {
    try {
      if (!token) {
        logout();
        return;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/mqtt-requests/available`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableConfigs(data.configs || []);
      } else {
        console.error('Failed to fetch available configs');
      }
    } catch (error) {
      console.error('Error fetching available configs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sendJoinRequest = async (config, message = '') => {
    try {
      setRequestingConfigs(prev => new Set([...prev, config._id]));

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/mqtt-requests/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mqttConfigId: config._id,
          message: message
        })
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          'Yêu cầu đã gửi',
          `Yêu cầu tham gia "${config.name}" đã được gửi đến ${config.adminUsername}. Bạn sẽ được thông báo khi họ phản hồi.`,
          [{ text: 'OK', onPress: () => fetchAvailableConfigs() }]
        );
      } else {
        const errorData = await response.json();
        Alert.alert('Lỗi', errorData.message || 'Không thể gửi yêu cầu tham gia');
      }
    } catch (error) {
      console.error('Error sending join request:', error);
      Alert.alert('Lỗi', 'Không thể gửi yêu cầu tham gia');
    } finally {
      setRequestingConfigs(prev => {
        const newSet = new Set(prev);
        newSet.delete(config._id);
        return newSet;
      });
    }
  };

  const confirmJoinRequest = (config) => {
    Alert.prompt(
      'Tham gia cấu hình MQTT',
      `Gửi yêu cầu tham gia "${config.name}" được quản lý bởi ${config.adminUsername}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gửi yêu cầu',
          onPress: (message) => sendJoinRequest(config, message || '')
        }
      ],
      'plain-text',
      '',
      'default',
      'Tin nhắn tùy chọn cho quản trị viên...'
    );
  };

  const renderConfig = ({ item }) => {
    const isRequesting = requestingConfigs.has(item._id);
    const timeAgo = getTimeAgo(new Date(item.createdAt));

    return (
      <ModernCard style={styles.configCard}>
        <View style={styles.configHeader}>
          <View style={styles.configInfo}>
            <Avatar.Text
              size={40}
              label={item.adminUsername.charAt(0).toUpperCase()}
              style={styles.adminAvatar}
              color="#FFFFFF"
            />
            <View style={styles.configDetails}>
              <Text style={styles.configName}>{item.name}</Text>
              <Text style={styles.adminName}>by {item.adminUsername}</Text>
              <Text style={styles.configEndpoint}>{item.host}:{item.port}</Text>
              <Text style={styles.timeAgo}>Tạo {timeAgo}</Text>
            </View>
          </View>
          
          <Chip
            icon="wifi"
            mode="outlined"
            style={styles.statusChip}
            textStyle={styles.chipText}
          >
            Có sẵn
          </Chip>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.actionContainer}>
          <Button
            mode="contained"
            onPress={() => confirmJoinRequest(item)}
            disabled={isRequesting}
            style={styles.joinButton}
            labelStyle={styles.buttonLabel}
            icon="person-add"
          >
            {isRequesting ? 'Đang gửi...' : 'Yêu cầu tham gia'}
          </Button>
        </View>
      </ModernCard>
    );
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} ngày trước`;
    if (hours > 0) return `${hours} giờ trước`;
    if (minutes > 0) return `${minutes} phút trước`;
    return 'vừa xong';
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAvailableConfigs();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#4C533E" />
        <LinearGradient
          colors={['#767E67', '#4C533E', '#3C3C40']}
          style={styles.container}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8BC34A" />
            <Text style={styles.loadingText}>Đang tìm cấu hình MQTT có sẵn...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4C533E" />
      <LinearGradient
        colors={['#767E67', '#4C533E', '#3C3C40']}
        style={styles.container}
      >
        {/* Custom Header with Back Button */}
        <View style={styles.customHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color="#8BC34A" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Tham gia mạng MQTT</Text>
            <Text style={styles.headerSubtitle}>
              Kết nối với các cấu hình MQTT hiện có
            </Text>
          </View>
          
          <View style={styles.headerRight} />
        </View>

      {availableConfigs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
          <Text style={styles.emptyTitle}>Không có mạng khả dụng</Text>
          <Text style={styles.emptySubtitle}>
            Hiện tại không có cấu hình MQTT công khai nào để tham gia. Bạn có thể tạo mới hoặc yêu cầu quản trị viên chia sẻ cấu hình của họ.
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('AddMqttConfig')}
            style={styles.createButton}
            labelStyle={styles.buttonLabel}
            icon="plus"
          >
            Tạo cấu hình MQTT mới
          </Button>
        </View>
      ) : (
        <FlatList
          data={availableConfigs}
          renderItem={renderConfig}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8BC34A']}
              tintColor="#8BC34A"
            />
          }
        />
      )}
    </LinearGradient>
  </SafeAreaView>
);
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#4C533E',
  },
  container: {
    flex: 1,
  },
  // Custom Header Styles
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    paddingTop: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 62,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  // Old header styles (keeping for compatibility)
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  configCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 4,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
  },
  configInfo: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  adminAvatar: {
    backgroundColor: '#689F38',
    marginRight: 12,
  },
  configDetails: {
    flex: 1,
  },
  configName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  adminName: {
    fontSize: 13,
    color: '#8BC34A',
    marginBottom: 2,
    fontWeight: '500',
  },
  configEndpoint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  timeAgo: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  statusChip: {
    backgroundColor: 'rgba(139, 195, 74, 0.2)',
    borderColor: '#8BC34A',
  },
  chipText: {
    color: '#8BC34A',
    fontSize: 11,
  },
  divider: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  actionContainer: {
    padding: 16,
  },
  joinButton: {
    backgroundColor: '#8BC34A',
    borderRadius: 10,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#8BC34A',
    borderRadius: 10,
  },
});

export default JoinMqttScreen;

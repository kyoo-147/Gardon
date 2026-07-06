import React, { useState, useEffect, useContext } from 'react';
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
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AuthContext from '../../context/AuthContext';
import { API_BASE_URL } from '../../constants';
import ModernCard from '../../components/ModernCard';

const { width } = Dimensions.get('window');

const MqttRequestsScreen = ({ navigation }) => {
  const { token } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingRequests, setProcessingRequests] = useState(new Set());

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      if (!token) {
        console.error('No token available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/mqtt-requests/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      } else {
        console.error('Failed to fetch requests');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleResponse = async (requestId, action, responseMessage = '') => {
    try {
      setProcessingRequests(prev => new Set([...prev, requestId]));

      const response = await fetch(`${API_BASE_URL}/mqtt-requests/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId,
          action,
          responseMessage
        })
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          'Thành công',
          data.message,
          [{ text: 'OK', onPress: () => fetchRequests() }]
        );
      } else {
        const errorData = await response.json();
        Alert.alert('Lỗi', errorData.message || 'Không thể phản hồi yêu cầu');
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      Alert.alert('Lỗi', 'Không thể phản hồi yêu cầu');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const confirmResponse = (request, action) => {
    const actionText = action === 'accept' ? 'chấp nhận' : 'từ chối';
    Alert.alert(
      `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} yêu cầu`,
      `Bạn có chắc chắn muốn ${actionText} yêu cầu của ${request.requesterUsername} để tham gia "${request.mqttConfigName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: actionText.charAt(0).toUpperCase() + actionText.slice(1),
          style: action === 'accept' ? 'default' : 'destructive',
          onPress: () => handleResponse(request._id, action)
        }
      ]
    );
  };

  const renderRequest = ({ item }) => {
    const isProcessing = processingRequests.has(item._id);
    const timeAgo = getTimeAgo(new Date(item.createdAt));

    return (
      <ModernCard style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.userInfo}>
            <Avatar.Text
              size={40}
              label={item.requesterUsername.charAt(0).toUpperCase()}
              style={styles.avatar}
              color="#FFFFFF"
            />
            <View style={styles.userDetails}>
              <Text style={styles.username}>{item.requesterUsername}</Text>
              <Text style={styles.email}>{item.requesterEmail}</Text>
              <Text style={styles.timeAgo}>{timeAgo}</Text>
            </View>
          </View>
          <Chip
            icon="wifi"
            mode="outlined"
            style={styles.mqttChip}
            textStyle={styles.chipText}
          >
            {item.mqttConfigName}
          </Chip>
        </View>

        {item.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Tin nhắn:</Text>
            <Text style={styles.messageText}>{item.message}</Text>
          </View>
        )}

        <Divider style={styles.divider} />

        <View style={styles.actionContainer}>
          <Button
            mode="contained"
            onPress={() => confirmResponse(item, 'accept')}
            disabled={isProcessing}
            style={[styles.actionButton, styles.acceptButton]}
            labelStyle={styles.buttonLabel}
            icon="check"
          >
            {isProcessing ? 'Đang xử lý...' : 'Chấp nhận'}
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => confirmResponse(item, 'reject')}
            disabled={isProcessing}
            style={[styles.actionButton, styles.rejectButton]}
            labelStyle={styles.rejectButtonLabel}
            icon="close"
          >
            {isProcessing ? 'Đang xử lý...' : 'Từ chối'}
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
    return 'Vừa xong';
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
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
            <Text style={styles.loadingText}>Đang tải yêu cầu...</Text>
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
            <Text style={styles.headerTitle}>Yêu cầu tham gia MQTT</Text>
            <Text style={styles.headerSubtitle}>
              {requests.length} yêu cầu đang chờ xử lý
            </Text>
          </View>
          
          <View style={styles.headerRight} />
        </View>

      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-open-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
          <Text style={styles.emptyTitle}>Không có yêu cầu đang chờ</Text>
          <Text style={styles.emptySubtitle}>
            Khi người dùng yêu cầu tham gia cấu hình MQTT của bạn, họ sẽ xuất hiện ở đây.
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
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
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  requestCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    backgroundColor: '#8BC34A',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  timeAgo: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  mqttChip: {
    backgroundColor: 'rgba(139, 195, 74, 0.2)',
    borderColor: '#8BC34A',
  },
  chipText: {
    color: '#8BC34A',
    fontSize: 11,
  },
  messageContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  messageLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
    fontWeight: '500',
  },
  messageText: {
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8BC34A',
  },
  divider: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
  },
  acceptButton: {
    backgroundColor: '#8BC34A',
  },
  rejectButton: {
    borderColor: '#FF6B6B',
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  rejectButtonLabel: {
    color: '#FF6B6B',
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
  },
});

export default MqttRequestsScreen;

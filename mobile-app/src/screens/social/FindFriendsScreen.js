import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  Dimensions,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {
  Text,
  Avatar,
  ActivityIndicator,
  Chip,
  Button,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../constants';

const { width } = Dimensions.get('window');

const FindFriendsScreen = ({ navigation }) => {
  const { token, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingRequests, setProcessingRequests] = useState(new Set());
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchPendingRequests();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.mqttConfigs.some(mqtt => 
          mqtt.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      if (!token) {
        logout();
        return;
      }

      console.log('🔍 Fetching MQTT users...');
      console.log('API URL:', API_ENDPOINTS.MQTT_USERS);
      console.log('Token exists:', !!token);

      const response = await fetch(API_ENDPOINTS.MQTT_USERS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 FindFriends API Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📋 FindFriends users data:', data);
        setUsers(data.users || []);
        setFilteredUsers(data.users || []);
      } else {
        console.error('Failed to fetch users');
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      if (!token) return;

      console.log('🔍 Fetching pending friend requests...');
      console.log('API URL:', API_ENDPOINTS.FRIEND_REQUESTS);

      const response = await fetch(API_ENDPOINTS.FRIEND_REQUESTS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Friend Requests API Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📋 Friend requests data:', data);
        setPendingRequests(data.requests || []);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch friend requests:', errorText);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const sendFriendRequest = async (targetUserId) => {
    try {
      setProcessingRequests(prev => new Set([...prev, targetUserId]));

      console.log('📤 Sending friend request to:', targetUserId);
      console.log('API URL:', API_ENDPOINTS.FRIEND_REQUEST);

      const response = await fetch(API_ENDPOINTS.FRIEND_REQUEST, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserId })
      });

      console.log('📡 Friend Request API Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Friend request response:', data);
        Alert.alert(
          'Đã gửi lời mời kết bạn',
          data.message,
          [{ text: 'OK', onPress: () => fetchUsers() }]
        );
      } else {
        const errorData = await response.json();
        console.error('❌ Friend request failed:', errorData);
        Alert.alert('Lỗi', errorData.message || 'Không thể gửi lời mời kết bạn');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Lỗi', 'Không thể gửi lời mời kết bạn');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  const respondToFriendRequest = async (friendshipId, action) => {
    try {
      console.log(`📤 Responding to friend request ${friendshipId} with action: ${action}`);
      console.log('API URL:', API_ENDPOINTS.FRIEND_RESPONSE);

      const response = await fetch(API_ENDPOINTS.FRIEND_RESPONSE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendshipId, action })
      });

      console.log('📡 Friend Response API Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Friend response success:', data);
        Alert.alert(
          'Thành công',
          data.message,
          [{ text: 'OK', onPress: () => {
            fetchUsers();
            fetchPendingRequests();
          }}]
        );
      } else {
        const errorData = await response.json();
        console.error('❌ Friend response failed:', errorData);
        Alert.alert('Lỗi', errorData.message || 'Không thể phản hồi lời mời kết bạn');
      }
    } catch (error) {
      console.error('Error responding to friend request:', error);
      Alert.alert('Lỗi', 'Không thể phản hồi lời mời kết bạn');
    }
  };

  const getStatusChipProps = (user) => {
    switch (user.friendshipStatus) {
      case 'friends':
        return { 
          text: 'Bạn bè', 
          color: '#8BC34A', 
          icon: 'account-plus-outline' 
        };
      case 'request_sent':
        return { 
          text: 'Đã gửi yêu cầu', 
          color: '#FF9800', 
          icon: 'account-plus-outline' 
        };
      case 'request_received':
        return { 
          text: 'Nhận được yêu cầu', 
          color: '#2196F3', 
          icon: 'mail' 
        };
      default:
        return { 
          text: 'Có sẵn', 
          color: 'rgba(255, 255, 255, 0.5)', 
          icon: 'person-add' 
        };
    }
  };

  const openChat = (friendUserId, friendUsername) => {
    navigation.navigate('ChatConversation', {
      friendUserId,
      friendUsername
    });
  };

  const renderUser = ({ item }) => {
    const isProcessing = processingRequests.has(item.userId);
    const statusProps = getStatusChipProps(item);
    const timeAgo = getTimeAgo(new Date(item.lastActive));
    const initials = item.username.split(' ').map(n => n[0]).join('').substring(0, 2);

    return (
      <TouchableOpacity style={styles.userCard} activeOpacity={0.7}>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Avatar.Text
              size={50}
              label={initials.toUpperCase()}
              style={styles.avatar}
              labelStyle={styles.avatarLabel}
            />
            <View style={styles.userDetails}>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.email}>{item.email}</Text>
              <Text style={styles.lastActive}>Hoạt động {timeAgo}</Text>
            </View>
          </View>
          
          <Chip
            icon={statusProps.icon}
            mode="outlined"
            style={[styles.statusChip, { borderColor: statusProps.color }]}
            textStyle={[styles.chipText, { color: statusProps.color }]}
            compact
          >
            {statusProps.text}
          </Chip>
        </View>

        {item.mqttConfigs.length > 0 && (
          <View style={styles.mqttConfigs}>
            <Text style={styles.mqttLabel}>Mạng được chia sẻ:</Text>
            <View style={styles.mqttChips}>
              {item.mqttConfigs.slice(0, 3).map((config, index) => (
                <View key={index} style={styles.mqttChip}>
                  <Text style={styles.mqttChipText}>{config}</Text>
                </View>
              ))}
              {item.mqttConfigs.length > 3 && (
                <View style={styles.mqttChip}>
                  <Text style={styles.mqttChipText}>+{item.mqttConfigs.length - 3}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.actionContainer}>
          {item.friendshipStatus === 'friends' && (
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => openChat(item.userId, item.username)}
            >
              <Ionicons name="chatbubble" size={16} color="#FFFFFF" />
              <Text style={styles.buttonText}>Trò chuyện</Text>
            </TouchableOpacity>
          )}
          
          {item.friendshipStatus === 'none' && item.canSendRequest && (
            <TouchableOpacity
              style={[styles.addButton, isProcessing && styles.disabledButton]}
              onPress={() => sendFriendRequest(item.userId)}
              disabled={isProcessing}
            >
              <Ionicons name="person-add" size={16} color="#FFFFFF" />
              <Text style={styles.buttonText}>
                {isProcessing ? 'Đang gửi...' : 'Thêm bạn'}
              </Text>
            </TouchableOpacity>
          )}
          
          {item.friendshipStatus === 'request_received' && (
            <View style={styles.requestActions}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => {
                  const request = pendingRequests.find(r => r.requesterUserId === item.userId);
                  if (request) respondToFriendRequest(request._id, 'accept');
                }}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.buttonText}>Chấp nhận</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => {
                  const request = pendingRequests.find(r => r.requesterUserId === item.userId);
                  if (request) respondToFriendRequest(request._id, 'reject');
                }}
              >
                <Ionicons name="close" size={16} color="#FF6B6B" />
                <Text style={styles.rejectButtonText}>Từ chối</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
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
    fetchUsers();
    fetchPendingRequests();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#4C533E" />
        <LinearGradient
          colors={['#767E67', '#4C533E', '#3C3C40', '#3C3C40']}
          style={styles.container}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8BC34A" />
            <Text style={styles.loadingText}>Đang tìm người dùng trong mạng của bạn...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4C533E" />
      <LinearGradient
        colors={['#767E67', '#4C533E', '#3C3C40', '#3C3C40']}
        style={styles.container}
      >
        {/* Custom Header */}
        <View style={styles.customHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color="#8BC34A" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Tìm bạn bè</Text>
          </View>
          
          <View style={styles.headerRight} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="rgba(255, 255, 255, 0.6)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm người dùng hoặc mạng..."
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="people-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'Không tìm thấy người dùng' : 'Không có người dùng'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'Thử điều chỉnh từ khóa tìm kiếm.'
                : 'Tham gia mạng MQTT để kết nối với người dùng khác.'
              }
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            renderItem={renderUser}
            keyExtractor={(item) => item.userId}
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
            ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  },
  headerRight: {
    width: 40,
  },
  // Search Styles
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    height: 36,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'System',
    paddingVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 16,
    fontSize: 17,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  avatarLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  lastActive: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  statusChip: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    height: 28,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  mqttConfigs: {
    marginBottom: 16,
  },
  mqttLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    fontWeight: '500',
  },
  mqttChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mqttChip: {
    backgroundColor: 'rgba(139, 195, 74, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.4)',
  },
  mqttChipText: {
    color: '#8BC34A',
    fontSize: 11,
    fontWeight: '500',
  },
  actionContainer: {
    marginTop: 4,
  },
  chatButton: {
    backgroundColor: '#8BC34A',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  addButton: {
    backgroundColor: '#8BC34A',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#8BC34A',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  rejectButton: {
    flex: 1,
    borderColor: '#FF6B6B',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  rejectButtonText: {
    color: '#FF6B6B',
    fontWeight: '600',
    fontSize: 15,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default FindFriendsScreen;

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
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

const FindFriendsScreen = ({ navigation }) => {
  const { token, logout, user } = useAuth();
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
  }, [users, searchQuery]);

  const fetchUsers = async () => {
    try {
      if (!token) {
        logout();
        return;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/social/mqtt-users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        console.error('Failed to fetch users');
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

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/social/friend-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const sendFriendRequest = async (userId) => {
    if (processingRequests.has(userId)) return;

    setProcessingRequests(prev => new Set(prev).add(userId));

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/social/friend-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ receiverUserId: userId })
      });

      if (response.ok) {
        Alert.alert('Success', 'Friend request sent!');
        fetchPendingRequests();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const respondToRequest = async (requestId, action) => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/social/friend-response`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requestId, action })
      });

      if (response.ok) {
        Alert.alert('Success', `Friend request ${action}ed!`);
        fetchPendingRequests();
        if (action === 'accept') {
          fetchUsers(); // Refresh to update friend status
        }
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || `Failed to ${action} friend request`);
      }
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error);
      Alert.alert('Error', `Failed to ${action} friend request`);
    }
  };

  const getUserStatus = (userId) => {
    const isPending = pendingRequests.some(req => 
      req.senderUserId === userId || req.receiverUserId === userId
    );
    const user = users.find(u => u.userId === userId);
    
    if (user?.friendshipStatus === 'accepted') return 'friends';
    if (isPending) return 'pending';
    return 'none';
  };

  const renderUserItem = ({ item }) => {
    const status = getUserStatus(item.userId);
    const isProcessing = processingRequests.has(item.userId);
    const initials = item.username.split(' ').map(n => n[0]).join('').substring(0, 2);

    return (
      <View style={styles.userItem}>
        <View style={styles.userInfo}>
          <Avatar.Text
            size={48}
            label={initials.toUpperCase()}
            style={styles.avatar}
            labelStyle={styles.avatarLabel}
          />
          <View style={styles.userDetails}>
            <Text style={styles.username}>{item.username}</Text>
            <View style={styles.mqttInfo}>
              <Ionicons name="wifi" size={14} color="#8E8E93" />
              <Text style={styles.mqttText}>
                {item.mqttConfigs.length} network{item.mqttConfigs.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionContainer}>
          {status === 'friends' ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.messageButton]}
              onPress={() => navigation.navigate('ChatConversation', {
                friendUserId: item.userId,
                friendUsername: item.username
              })}
            >
              <Ionicons name="chatbubble" size={16} color="#FFFFFF" />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          ) : status === 'pending' ? (
            <View style={[styles.actionButton, styles.pendingButton]}>
              <Ionicons name="time" size={16} color="#8E8E93" />
              <Text style={styles.pendingButtonText}>Pending</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.addButton]}
              onPress={() => sendFriendRequest(item.userId)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <>
                  <Ionicons name="person-add" size={16} color="#007AFF" />
                  <Text style={styles.addButtonText}>Add</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderPendingRequest = ({ item }) => {
    const initials = item.senderUsername.split(' ').map(n => n[0]).join('').substring(0, 2);

    return (
      <View style={styles.requestItem}>
        <View style={styles.userInfo}>
          <Avatar.Text
            size={48}
            label={initials.toUpperCase()}
            style={styles.avatar}
            labelStyle={styles.avatarLabel}
          />
          <View style={styles.userDetails}>
            <Text style={styles.username}>{item.senderUsername}</Text>
            <Text style={styles.requestText}>wants to be friends</Text>
          </View>
        </View>

        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.requestButton, styles.acceptButton]}
            onPress={() => respondToRequest(item._id, 'accept')}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.requestButton, styles.declineButton]}
            onPress={() => respondToRequest(item._id, 'reject')}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
    fetchPendingRequests();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <LinearGradient
          colors={['#F8F9FA', '#FFFFFF']}
          style={styles.container}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Finding friends...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <LinearGradient
        colors={['#F8F9FA', '#FFFFFF']}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={28} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Find Friends</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#8E8E93" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor="#8E8E93"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
        </View>

        {/* Content */}
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          ListHeaderComponent={
            pendingRequests.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Friend Requests</Text>
                {pendingRequests.map((request) => (
                  <View key={request._id}>
                    {renderPendingRequest({ item: request })}
                  </View>
                ))}
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionTitle}>Suggested Friends</Text>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>People You May Know</Text>
              </View>
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={80} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.emptySubtitle}>
                Try connecting to more MQTT networks or check back later.
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#C7C7CC',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 44,
  },
  searchContainer: {
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8E8E93',
    marginTop: 16,
    fontSize: 17,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  sectionDivider: {
    height: 0.5,
    backgroundColor: '#C7C7CC',
    marginVertical: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    marginBottom: 8,
    borderRadius: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    backgroundColor: '#007AFF',
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
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  mqttInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mqttText: {
    fontSize: 15,
    color: '#8E8E93',
    marginLeft: 4,
  },
  requestText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  actionContainer: {
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 4,
  },
  messageButton: {
    backgroundColor: '#007AFF',
  },
  messageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  pendingButton: {
    backgroundColor: '#F2F2F7',
  },
  pendingButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 4,
  },
  requestActions: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  requestButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#007AFF',
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#C7C7CC',
    marginLeft: 76,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default FindFriendsScreen;

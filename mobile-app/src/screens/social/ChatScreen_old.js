import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import {
  Text,
  Avatar,
  Surface,
  ActivityIndicator,
  SearchBar,
  IconButton,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

const ChatScreen = ({ navigation }) => {
  const { token, logout, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchConversations();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    // Filter conversations based on search query
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv =>
        conv.friendUsername.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [conversations, searchQuery]);

  const fetchConversations = async () => {
    try {
      if (!token) {
        logout();
        return;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        console.error('Failed to fetch conversations');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openConversation = (friendUserId, friendUsername) => {
    navigation.navigate('ChatConversation', {
      friendUserId,
      friendUsername
    });
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
  };

  const renderConversation = ({ item }) => {
    const hasUnread = item.unreadCount > 0;
    const lastMessagePreview = item.lastMessage
      ? `${item.lastMessage.isFromMe ? 'You: ' : ''}${item.lastMessage.content}`
      : 'No messages yet';

    return (
      <TouchableOpacity
        onPress={() => openConversation(item.friendUserId, item.friendUsername)}
      >
        <Card style={[styles.conversationCard, hasUnread && styles.unreadCard]}>
          <View style={styles.conversationContent}>
            <View style={styles.avatarContainer}>
              <Avatar.Text
                size={50}
                label={item.friendUsername.charAt(0).toUpperCase()}
                style={styles.avatar}
                color="#FFFFFF"
              />
              {hasUnread && (
                <Badge
                  style={styles.unreadBadge}
                  size={20}
                >
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Badge>
              )}
            </View>
            
            <View style={styles.messageInfo}>
              <View style={styles.messageHeader}>
                <Text style={[styles.friendName, hasUnread && styles.unreadText]}>
                  {item.friendUsername}
                </Text>
                {item.lastMessage && (
                  <Text style={styles.timestamp}>
                    {getTimeAgo(item.updatedAt)}
                  </Text>
                )}
              </View>
              
              <Text 
                style={[styles.lastMessage, hasUnread && styles.unreadMessage]}
                numberOfLines={2}
              >
                {lastMessagePreview}
              </Text>
            </View>
            
            <View style={styles.conversationActions}>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color="rgba(255, 255, 255, 0.5)" 
              />
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#767E67', '#4C533E', '#3C3C40']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8BC34A" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#767E67', '#4C533E', '#3C3C40']}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>
            Chat with your MQTT network friends
          </Text>
        </View>
        <TouchableOpacity
          style={styles.findFriendsButton}
          onPress={() => navigation.navigate('FindFriends')}
        >
          <Ionicons name="person-add-outline" size={20} color="#8BC34A" />
        </TouchableOpacity>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
          <Text style={styles.emptyTitle}>No Conversations Yet</Text>
          <Text style={styles.emptySubtitle}>
            Connect with other users in your MQTT network to start chatting.
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('FindFriends')}
            style={styles.findFriendsButtonLarge}
            labelStyle={styles.buttonLabel}
            icon="account-plus-outline"
          >
            Find Friends
          </Button>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.friendUserId}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
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
  findFriendsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 195, 74, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8BC34A',
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
  conversationCard: {
    marginBottom: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8BC34A',
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    backgroundColor: '#689F38',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF6B6B',
    color: '#FFFFFF',
    fontSize: 10,
  },
  messageInfo: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  unreadText: {
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  lastMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
  unreadMessage: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  conversationActions: {
    marginLeft: 8,
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
  findFriendsButtonLarge: {
    backgroundColor: '#8BC34A',
    borderRadius: 10,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default ChatScreen;

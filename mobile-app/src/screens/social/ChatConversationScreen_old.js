import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  IconButton,
  Avatar,
  Surface,
  ActivityIndicator,
  Menu,
  Divider,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

const ChatConversationScreen = ({ route, navigation }) => {
  const { friendUserId, friendUsername } = route.params;
  const { token, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const flatListRef = useRef();

  useEffect(() => {
    navigation.setOptions({
      headerTitle: friendUsername,
      headerStyle: {
        backgroundColor: '#4C533E',
      },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
      headerRight: () => (
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              iconColor="#FFFFFF"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item onPress={() => {}} title="Xem hồ sơ" />
          <Menu.Item onPress={() => {}} title="Chặn người dùng" />
          <Divider />
          <Menu.Item onPress={() => {}} title="Xóa cuộc trò chuyện" />
        </Menu>
      ),
    });

    fetchMessages();
  }, []);

  const fetchMessages = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      if (!token) {
        logout();
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/messages/conversation/${friendUserId}?page=${pageNum}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (pageNum === 1) {
          setMessages(data.messages || []);
        } else {
          setMessages(prev => [...data.messages, ...prev]);
        }
        setHasMore(data.pagination.hasMore);
      } else {
        console.error('Failed to fetch messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || sending) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiverUserId: friendUserId,
          content: text,
          type: 'text'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.messageData]);
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to send message');
        setMessageText(text); // Restore message if failed
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setMessageText(text); // Restore message if failed
    } finally {
      setSending(false);
    }
  };

  const loadMoreMessages = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMessages(nextPage);
  };

  const formatTime = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const isToday = messageDate.toDateString() === now.toDateString();
    
    if (isToday) {
      return messageDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return messageDate.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const renderMessage = ({ item, index }) => {
    const isCurrentUser = item.senderUserId === friendUserId ? false : true;
    const showTime = index === messages.length - 1 || 
      (index < messages.length - 1 && 
        new Date(messages[index + 1].createdAt) - new Date(item.createdAt) > 300000); // 5 minutes

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.sentMessage : styles.receivedMessage
      ]}>
        {!isCurrentUser && (
          <Avatar.Text
            size={32}
            label={friendUsername.charAt(0).toUpperCase()}
            style={styles.messageAvatar}
            color="#FFFFFF"
          />
        )}
        
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.sentBubble : styles.receivedBubble
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.sentText : styles.receivedText
          ]}>
            {item.content}
          </Text>
          
          {showTime && (
            <Text style={[
              styles.messageTime,
              isCurrentUser ? styles.sentTime : styles.receivedTime
            ]}>
              {formatTime(item.createdAt)}
              {isCurrentUser && item.readAt && (
                <Text style={styles.readIndicator}> ✓✓</Text>
              )}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#767E67', '#4C533E', '#3C3C40']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8BC34A" />
          <Text style={styles.loadingText}>Đang tải cuộc trò chuyện...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#767E67', '#4C533E', '#3C3C40']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Avatar.Text
              size={80}
              label={friendUsername.charAt(0).toUpperCase()}
              style={styles.emptyAvatar}
              color="#FFFFFF"
            />
            <Text style={styles.emptyTitle}>
              Start chatting with {friendUsername}
            </Text>
            <Text style={styles.emptySubtitle}>
              Send a message to begin your conversation
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.1}
            ListHeaderComponent={
              loadingMore ? (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color="#8BC34A" />
                </View>
              ) : null
            }
          />
        )}

        <Surface style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            theme={{
              colors: {
                primary: '#8BC34A',
                text: '#FFFFFF',
                placeholder: 'rgba(255, 255, 255, 0.5)',
              }
            }}
          />
          
          <IconButton
            icon={sending ? "clock-outline" : "send"}
            iconColor={messageText.trim() ? "#8BC34A" : "rgba(255, 255, 255, 0.3)"}
            size={24}
            onPress={sendMessage}
            disabled={!messageText.trim() || sending}
            style={styles.sendButton}
          />
        </Surface>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
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
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  loadMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  sentMessage: {
    justifyContent: 'flex-end',
  },
  receivedMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    backgroundColor: '#689F38',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: width * 0.7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  sentBubble: {
    backgroundColor: '#8BC34A',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#2C2C2E',
    borderBottomLeftRadius: 4,
    marginLeft: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentText: {
    color: '#FFFFFF',
  },
  receivedText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  sentTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  receivedTime: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  readIndicator: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2C2C2E',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#383838',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    color: '#FFFFFF',
    marginRight: 8,
  },
  sendButton: {
    margin: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyAvatar: {
    backgroundColor: '#689F38',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ChatConversationScreen;

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  StatusBar,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  IconButton,
  Avatar,
  ActivityIndicator,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
// import { useCall } from '../../context/CallContext';

const { width, height } = Dimensions.get('window');

const ChatConversationScreen = ({ route, navigation }) => {
  const { friendUserId, friendUsername } = route.params;
  const { token, logout, user } = useAuth();
//   const { startVoiceCall, startVideoCall } = useCall();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const flatListRef = useRef();

  useEffect(() => {
    navigation.setOptions({
      headerShown: false, // Disable default header, we'll create custom one
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
        Alert.alert('Lỗi', errorData.message || 'Không thể gửi tin nhắn');
        setMessageText(text); // Restore message if failed
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
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
        hour12: false 
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
    const isCurrentUser = item.senderUserId !== friendUserId;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    
    const isFirstInGroup = !previousMessage || previousMessage.senderUserId !== item.senderUserId;
    const isLastInGroup = !nextMessage || nextMessage.senderUserId !== item.senderUserId;
    
    const showTime = isLastInGroup && (
      index === messages.length - 1 || 
      (nextMessage && new Date(nextMessage.createdAt) - new Date(item.createdAt) > 60000) // 1 minute
    );

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.sentMessageContainer : styles.receivedMessageContainer
      ]}>
        {!isCurrentUser && isFirstInGroup && (
          <Avatar.Text
            size={28}
            label={friendUsername.charAt(0).toUpperCase()}
            style={styles.messageAvatar}
            labelStyle={styles.messageAvatarLabel}
          />
        )}
        
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.sentBubble : styles.receivedBubble,
          isFirstInGroup && (isCurrentUser ? styles.sentBubbleFirst : styles.receivedBubbleFirst),
          isLastInGroup && (isCurrentUser ? styles.sentBubbleLast : styles.receivedBubbleLast),
          !isFirstInGroup && !isLastInGroup && styles.messageBubbleMiddle,
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.sentText : styles.receivedText
          ]}>
            {item.content}
          </Text>
        </View>
        
        {!isCurrentUser && !isFirstInGroup && <View style={styles.avatarSpacer} />}
        
        {showTime && (
          <View style={styles.timeContainer}>
            <Text style={styles.messageTime}>
              {formatTime(item.createdAt)}
              {isCurrentUser && item.readAt && (
                <Text style={styles.readIndicator}> Đã đọc</Text>
              )}
            </Text>
          </View>
        )}
      </View>
    );
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
            <Text style={styles.loadingText}>Đang tải cuộc trò chuyện...</Text>
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
          
          <TouchableOpacity style={styles.headerCenter} activeOpacity={0.7}>
            <Avatar.Text
              size={34}
              label={friendUsername.charAt(0).toUpperCase()}
              style={styles.headerAvatar}
              labelStyle={styles.headerAvatarLabel}
            />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName} numberOfLines={1}>{friendUsername}</Text>
              <Text style={styles.headerStatus}>Hoạt động ngay bây giờ</Text>
            </View>
          </TouchableOpacity>
          
          
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Avatar.Text
                size={80}
                label={friendUsername.charAt(0).toUpperCase()}
                style={styles.emptyAvatar}
                labelStyle={styles.emptyAvatarLabel}
              />
              <Text style={styles.emptyTitle}>
                Chào {friendUsername}
              </Text>
              <Text style={styles.emptySubtitle}>
                Đây là khởi đầu cuộc trò chuyện của bạn.
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

          {/* Optimized Input Container */}
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.attachButton}>
                <Ionicons name="add" size={20} color="#8BC34A" />
              </TouchableOpacity>
              
              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập tin nhắn..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  maxLength={1000}
                />
              </View>
              
              {messageText.trim() ? (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={sendMessage}
                  disabled={sending}
                >
                  <Ionicons 
                    name={sending ? "hourglass" : "arrow-up"} 
                    size={18} 
                    color="#FFFFFF" 
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.micButton}>
                  <Ionicons name="mic-outline" size={20} color="#8BC34A" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
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
  keyboardView: {
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerAvatar: {
    backgroundColor: '#8BC34A',
    marginRight: 12,
  },
  headerAvatarLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 1,
  },
  headerStatus: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 4,
  },
  // Existing styles
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    marginBottom: 4,
    maxWidth: width * 0.75,
  },
  sentMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  receivedMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  messageAvatar: {
    backgroundColor: '#8BC34A',
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageAvatarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  avatarSpacer: {
    width: 36,
    marginRight: 8,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  sentBubble: {
    backgroundColor: '#8BC34A',
    borderRadius: 20,
    borderBottomRightRadius: 6,
  },
  receivedBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sentBubbleFirst: {
    borderTopRightRadius: 20,
  },
  sentBubbleLast: {
    borderBottomRightRadius: 6,
  },
  receivedBubbleFirst: {
    borderTopLeftRadius: 20,
  },
  receivedBubbleLast: {
    borderBottomLeftRadius: 6,
  },
  messageBubbleMiddle: {
    borderRadius: 20,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  sentText: {
    color: '#FFFFFF',
  },
  receivedText: {
    color: '#FFFFFF',
  },
  timeContainer: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  messageTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  readIndicator: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 50,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 195, 74, 0.2)',
    marginBottom: 2,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 36,
    maxHeight: 100,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textInput: {
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 22,
    maxHeight: 80,
    lineHeight: 22,
  },
  sendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#8BC34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  micButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 195, 74, 0.2)',
    marginBottom: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyAvatar: {
    backgroundColor: '#8BC34A',
    marginBottom: 20,
  },
  emptyAvatarLabel: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
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

export default ChatConversationScreen;

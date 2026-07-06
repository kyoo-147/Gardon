import React, { useState, useContext, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  StatusBar, 
  TouchableOpacity,
  Platform,
  Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Text, 
  TextInput, 
  Button, 
  Avatar,
  HelperText,
  Divider,
  IconButton,
  Snackbar
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthContext from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../constants';

const { width, height } = Dimensions.get('window');

// INPUT_THEME for consistent styling with other screens
const INPUT_THEME = {
  colors: {
    primary: '#8BC34A',
    background: 'rgba(255, 255, 255, 0.1)',
    onSurface: '#FFFFFF',
    outline: 'rgba(255, 255, 255, 0.3)',
    placeholder: 'rgba(255, 255, 255, 0.7)',
    onSurfaceVariant: 'rgba(255, 255, 255, 0.8)',
  }
};

const EditProfileScreen = ({ navigation }) => {
  const { user, token, updateUser } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    email: user?.email || '',
    phone: user?.profile?.phone || '',
    bio: user?.profile?.bio || ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Hide TabBar
  useEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' }
    });
    
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'flex' }
      });
    };
  }, [navigation]);

  const showMessage = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Tên là bắt buộc';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Họ là bắt buộc';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Vui lòng nhập email hợp lệ';
    }
    
    if (formData.phone && !/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Vui lòng nhập số điện thoại hợp lệ';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Mật khẩu hiện tại là bắt buộc';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'Mật khẩu mới là bắt buộc';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateProfile = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.AUTH}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profile: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            bio: formData.bio
          },
          email: formData.email
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        updateUser(data.user);
        showMessage('Hồ sơ đã được cập nhật thành công! 🌱');
      } else {
        throw new Error(data.message || 'Không thể cập nhật hồ sơ');
      }
    } catch (error) {
      showMessage('Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.AUTH}/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordSection(false);
        showMessage('Đã thay đổi mật khẩu thành công! 🔐');
      } else {
        throw new Error(data.message || 'Không thể thay đổi mật khẩu');
      }
    } catch (error) {
      showMessage('Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const firstName = formData.firstName || user?.profile?.firstName || '';
    const lastName = formData.lastName || user?.profile?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderProfileSection = () => (
    <View style={styles.section}>
      <View style={styles.avatarSection}>
        <Avatar.Text
          size={90}
          label={getInitials()}
          style={styles.avatar}
          color="#FFFFFF"
        />
        <TouchableOpacity style={styles.cameraButton}>
          <Ionicons name="camera" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.avatarSubtitle}>🌱 Hồ sơ người chăm sóc vườn</Text>
    </View>
  );

  const renderPersonalInfoSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🧑‍🌾 Thông tin người chăm sóc vườn</Text>
      
      <TextInput
        key="firstName"
        label="Tên"
        value={formData.firstName}
        onChangeText={(text) => setFormData({ ...formData, firstName: text })}
        style={styles.input}
        theme={INPUT_THEME}
        textColor="#FFFFFF"
        placeholderTextColor="rgba(255, 255, 255, 0.7)"
        error={!!errors.firstName}
        left={<TextInput.Icon icon="account" color="#8BC34A" />}
      />
      <HelperText type="error" visible={!!errors.firstName} style={styles.errorText}>
        {errors.firstName}
      </HelperText>

      <TextInput
        key="lastName"
        label="Họ"
        value={formData.lastName}
        onChangeText={(text) => setFormData({ ...formData, lastName: text })}
        style={styles.input}
        theme={INPUT_THEME}
        textColor="#FFFFFF"
        placeholderTextColor="rgba(255, 255, 255, 0.7)"
        error={!!errors.lastName}
        left={<TextInput.Icon icon="account" color="#8BC34A" />}
      />
      <HelperText type="error" visible={!!errors.lastName} style={styles.errorText}>
        {errors.lastName}
      </HelperText>

      <TextInput
        key="email"
        label="Email"
        value={formData.email}
        onChangeText={(text) => setFormData({ ...formData, email: text })}
        style={styles.input}
        theme={INPUT_THEME}
        textColor="#FFFFFF"
        placeholderTextColor="rgba(255, 255, 255, 0.7)"
        error={!!errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        left={<TextInput.Icon icon="email" color="#8BC34A" />}
      />
      <HelperText type="error" visible={!!errors.email} style={styles.errorText}>
        {errors.email}
      </HelperText>

      <TextInput
        key="phone"
        label="Điện thoại (tùy chọn)"
        value={formData.phone}
        onChangeText={(text) => setFormData({ ...formData, phone: text })}
        style={styles.input}
        theme={INPUT_THEME}
        textColor="#FFFFFF"
        placeholderTextColor="rgba(255, 255, 255, 0.7)"
        error={!!errors.phone}
        keyboardType="phone-pad"
        left={<TextInput.Icon icon="phone" color="#8BC34A" />}
      />
      <HelperText type="error" visible={!!errors.phone} style={styles.errorText}>
        {errors.phone}
      </HelperText>

      <TextInput
        key="bio"
        label="Về khu vườn của bạn (tùy chọn)"
        value={formData.bio}
        onChangeText={(text) => setFormData({ ...formData, bio: text })}
        style={styles.input}
        theme={INPUT_THEME}
        textColor="#FFFFFF"
        placeholderTextColor="rgba(255, 255, 255, 0.7)"
        multiline
        numberOfLines={3}
        left={<TextInput.Icon icon="text" color="#8BC34A" />}
        placeholder="Chia sẻ về sở thích làm vườn của bạn..."
      />

      <TouchableOpacity 
        style={styles.gradientButton} 
        onPress={handleUpdateProfile}
        disabled={loading}
      >
        <LinearGradient
          colors={['#8BC34A', '#689F38']}
          style={styles.buttonGradient}
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>
            {loading ? 'Đang cập nhật...' : 'Cập nhật hồ sơ vườn'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderPasswordSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🔐 Cài đặt bảo mật</Text>
      
      <TouchableOpacity
        style={[
          styles.toggleButton,
          showPasswordSection && styles.toggleButtonActive
        ]}
        onPress={() => setShowPasswordSection(!showPasswordSection)}
      >
        <Text style={[
          styles.toggleButtonText,
          showPasswordSection && styles.toggleButtonTextActive
        ]}>
          Thay đổi mật khẩu
        </Text>
        <Ionicons 
          name={showPasswordSection ? "chevron-up" : "chevron-down"} 
          size={16} 
          color={showPasswordSection ? "#8BC34A" : "rgba(255, 255, 255, 0.7)"} 
        />
      </TouchableOpacity>

      {showPasswordSection && (
        <>
          <View style={styles.divider} />
          
          <TextInput
            key="currentPassword"
            label="Mật khẩu hiện tại"
            value={passwordData.currentPassword}
            onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
            style={styles.input}
            theme={INPUT_THEME}
            textColor="#FFFFFF"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            error={!!errors.currentPassword}
            secureTextEntry
            left={<TextInput.Icon icon="lock" color="#8BC34A" />}
          />
          <HelperText type="error" visible={!!errors.currentPassword} style={styles.errorText}>
            {errors.currentPassword}
          </HelperText>

          <TextInput
            key="newPassword"
            label="Mật khẩu mới"
            value={passwordData.newPassword}
            onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
            style={styles.input}
            theme={INPUT_THEME}
            textColor="#FFFFFF"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            error={!!errors.newPassword}
            secureTextEntry
            left={<TextInput.Icon icon="lock-plus" color="#8BC34A" />}
          />
          <HelperText type="error" visible={!!errors.newPassword} style={styles.errorText}>
            {errors.newPassword}
          </HelperText>

          <TextInput
            key="confirmPassword"
            label="Xác nhận mật khẩu mới"
            value={passwordData.confirmPassword}
            onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
            style={styles.input}
            theme={INPUT_THEME}
            textColor="#FFFFFF"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            error={!!errors.confirmPassword}
            secureTextEntry
            left={<TextInput.Icon icon="lock-check" color="#8BC34A" />}
          />
          <HelperText type="error" visible={!!errors.confirmPassword} style={styles.errorText}>
            {errors.confirmPassword}
          </HelperText>

          <TouchableOpacity 
            style={styles.gradientButton} 
            onPress={handleChangePassword}
            disabled={loading}
          >
            <LinearGradient
              colors={['#FF9800', '#F57C00']}
              style={styles.buttonGradient}
            >
              <Ionicons name="key" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>
                {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#767E67', '#4C533E', '#3C3C40', '#3C3C40']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {renderHeader()}
          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderProfileSection()}
            {renderPersonalInfoSection()}
            {renderPasswordSection()}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Snackbar from top */}
      <View style={styles.snackbarWrapper}>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={styles.snackbarTop}
        >
          <Text style={styles.snackbarText}>{snackbarMessage}</Text>
        </Snackbar>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'ios' ? 10 : 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatar: {
    backgroundColor: '#8BC34A',
    marginBottom: 8,
  },
  cameraButton: {
    position: 'absolute',
    right: '35%',
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8BC34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#FFFFFF',
  },
  input: {
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  errorText: {
    color: '#FFB3B3',
  },
  gradientButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
    width: '100%',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(139, 195, 74, 0.2)',
    borderColor: '#8BC34A',
  },
  toggleButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginRight: 8,
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#8BC34A',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 16,
  },
  snackbarWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  snackbarTop: {
    backgroundColor: 'rgba(139, 195, 74, 0.95)',
    marginTop: Platform.OS === 'ios' ? 50 : 40,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  snackbarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;

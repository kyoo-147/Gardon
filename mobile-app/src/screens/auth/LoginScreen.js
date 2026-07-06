import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import {
  Text,
  TextInput,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const { login, isLoading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    if (error) clearError();
  };

  const handleLogin = async () => {
    if (!formData.username.trim() || !formData.password.trim()) {
      setShowSnackbar(true);
      return;
    }

    try {
      await login({
        username: formData.username.trim(),
        password: formData.password,
      });
      // Navigation will be handled by the auth state change
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background Image */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=800&fit=crop&crop=center' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Dark overlay */}
        <View style={styles.overlay} />
        
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Logo Section */}
              <View style={styles.logoSection}>
                <View style={styles.logoContainer}>
                  <Ionicons name="wifi" size={24} color="#8BC34A" />
                  <Text style={styles.logoText}>Gardon</Text>
                </View>
              </View>

              {/* Header */}
              <View style={styles.headerSection}>
                <Text style={styles.title}>ĐĂNG NHẬP</Text>
                <Text style={styles.subtitle}>
                  Có vẻ như bạn chưa có tài khoản. Chúng tôi sẽ tạo một{'\n'}
                  tài khoản mới cho bạn.
                </Text>
              </View>

              {/* Form Section */}
              <View style={styles.formSection}>
                  {/* Email Input */}
                  <View style={styles.inputContainer}>
                    <TextInput
                      mode="flat"
                      label="Email"
                      value={formData.username}
                      onChangeText={(value) => handleInputChange('username', value)}
                      style={styles.input}
                      contentStyle={styles.inputContent}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      theme={{
                        colors: {
                          primary: '#8BC34A',
                          background: '#FFFFFF',
                          placeholder: '#999',
                          text: '#333',
                          onSurfaceVariant: '#999',
                        }
                      }}
                      underlineColor="transparent"
                      activeUnderlineColor="transparent"
                    />
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputContainer}>
                    <TextInput
                      mode="flat"
                      label="Mật khẩu"
                      value={formData.password}
                      onChangeText={(value) => handleInputChange('password', value)}
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      contentStyle={styles.inputContent}
                      right={
                        <TextInput.Icon
                          icon={showPassword ? 'eye-off' : 'eye'}
                          onPress={() => setShowPassword(!showPassword)}
                          iconColor="#999"
                          size={20}
                        />
                      }
                      theme={{
                        colors: {
                          primary: '#8BC34A',
                          background: '#FFFFFF',
                          placeholder: '#999',
                          text: '#333',
                          onSurfaceVariant: '#999',
                        }
                      }}
                      underlineColor="transparent"
                      activeUnderlineColor="transparent"
                    />
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.buttonsSection}>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={handleLogin}
                      disabled={isLoading}
                      activeOpacity={0.8}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.primaryButtonText}>ĐĂNG NHẬP</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={handleRegister}
                      disabled={isLoading}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.secondaryButtonText}>ĐĂNG KÝ</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Divider */}
                  <View style={styles.dividerSection}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>HOẶC</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Social Login */}
                  <View style={styles.socialSection}>
                    <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                      <Ionicons name="logo-google" size={20} color="#DB4437" style={styles.socialIcon} />
                      <Text style={styles.socialButtonText}>Đăng nhập với Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                      <Ionicons name="logo-apple" size={20} color="#000" style={styles.socialIcon} />
                      <Text style={styles.socialButtonText}>Đăng nhập với Apple</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Guest Access */}
                  <TouchableOpacity style={styles.guestButton} activeOpacity={0.7}>
                    <Text style={styles.guestButtonText}>TIẾP TỤC VỚI TƯ CÁCH LÀ KHÁCH</Text>
                  </TouchableOpacity>
                </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>

      {/* Snackbars */}
      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={3000}
        style={styles.snackbar}
      >
        <Text style={styles.snackbarText}>Vui lòng điền đầy đủ thông tin</Text>
      </Snackbar>

      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={5000}
        style={styles.snackbar}
        action={{
          label: 'Đóng',
          onPress: clearError,
          textColor: '#FFFFFF',
        }}
      >
        <Text style={styles.snackbarText}>{error}</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  
  // Logo Section
  logoSection: {
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
    letterSpacing: 1,
  },
  
  // Header Section
  headerSection: {
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'left',
    lineHeight: 20,
  },
  
  // Form Section
  formSection: {
    paddingHorizontal: 24,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 48,
  },
  inputContent: {
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#333333',
  },
  
  // Buttons Section
  buttonsSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#8BC34A',
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: '#8BC34A',
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  
  // Divider Section
  dividerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: 16,
    letterSpacing: 0.5,
  },
  
  // Social Section
  socialSection: {
    marginBottom: 24,
  },
  socialButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  socialIcon: {
    marginRight: 12,
  },
  socialButtonText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Guest Button
  guestButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  guestButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textDecorationLine: 'underline',
  },
  
  // Snackbar
  snackbar: {
    backgroundColor: '#8BC34A',
    marginBottom: 20,
  },
  snackbarText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default LoginScreen;

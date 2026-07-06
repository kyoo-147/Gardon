import React, { useState, useContext } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Avatar,
  HelperText,
  Divider,
  IconButton
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthContext from '../../context/AuthContext';
import { API_ENDPOINTS, COLORS } from '../../constants';
import ModernCard from '../../components/ModernCard';

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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (formData.phone && !/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        throw new Error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
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
        Alert.alert('Success', 'Password changed successfully!');
      } else {
        throw new Error(data.message || 'Failed to change password');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const firstName = formData.firstName || user?.profile?.firstName || '';
    const lastName = formData.lastName || user?.profile?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          {/* Profile Picture Section */}
          <ModernCard>
            <View style={styles.avatarSection}>
              <Avatar.Text
                size={90}
                label={getInitials()}
                style={styles.avatar}
                color={COLORS.white}
              />
              <IconButton
                icon="camera"
                mode="contained"
                onPress={() => Alert.alert('Info', 'Photo upload coming soon!')}
                style={styles.cameraButton}
                iconColor={COLORS.white}
                containerColor={COLORS.primary}
              />
            </View>
            <Text style={styles.avatarSubtitle}>🌱 Garden Keeper Profile</Text>
          </ModernCard>

          {/* Personal Information */}
          <ModernCard>
            <Text style={styles.sectionTitle}>🧑‍🌾 Gardener Information</Text>
            
            <TextInput
              label="First Name"
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
              style={styles.input}
              error={!!errors.firstName}
              left={<TextInput.Icon icon="account" color={COLORS.primary} />}
              theme={{ colors: { primary: COLORS.primary } }}
            />
            <HelperText type="error" visible={!!errors.firstName}>
              {errors.firstName}
            </HelperText>

            <TextInput
              label="Last Name"
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
              style={styles.input}
              error={!!errors.lastName}
              left={<TextInput.Icon icon="account" color={COLORS.primary} />}
              theme={{ colors: { primary: COLORS.primary } }}
            />
            <HelperText type="error" visible={!!errors.lastName}>
              {errors.lastName}
            </HelperText>

            <TextInput
              label="Email"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              style={styles.input}
              error={!!errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email" color={COLORS.primary} />}
              theme={{ colors: { primary: COLORS.primary } }}
            />
            <HelperText type="error" visible={!!errors.email}>
              {errors.email}
            </HelperText>

            <TextInput
              label="Phone (Optional)"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              style={styles.input}
              error={!!errors.phone}
              keyboardType="phone-pad"
              left={<TextInput.Icon icon="phone" color={COLORS.primary} />}
              theme={{ colors: { primary: COLORS.primary } }}
            />
            <HelperText type="error" visible={!!errors.phone}>
              {errors.phone}
            </HelperText>

            <TextInput
              label="About Your Garden (Optional)"
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              style={styles.input}
              multiline
              numberOfLines={3}
              left={<TextInput.Icon icon="text" color={COLORS.primary} />}
              theme={{ colors: { primary: COLORS.primary } }}
              placeholder="Tell us about your gardening interests..."
            />

            <Button
              mode="contained"
              onPress={handleUpdateProfile}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
              icon="check"
              buttonColor={COLORS.primary}
              contentStyle={{ paddingVertical: 8 }}
            >
              Update Garden Profile
            </Button>
          </ModernCard>

          {/* Password Section */}
          <ModernCard>
            <View style={styles.passwordHeader}>
              <Text style={styles.sectionTitle}>🔐 Security Settings</Text>
              <Button
                mode={showPasswordSection ? "outlined" : "contained-tonal"}
                onPress={() => setShowPasswordSection(!showPasswordSection)}
                icon={showPasswordSection ? "chevron-up" : "chevron-down"}
                compact
                buttonColor={showPasswordSection ? "transparent" : COLORS.secondary}
                textColor={showPasswordSection ? COLORS.primary : COLORS.white}
                theme={{ colors: { outline: COLORS.primary } }}
              >
                Change Password
              </Button>
            </View>

            {showPasswordSection && (
              <>
                <Divider style={styles.divider} />
                
                <TextInput
                  label="Current Password"
                  value={passwordData.currentPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
                  style={styles.input}
                  error={!!errors.currentPassword}
                  secureTextEntry
                  left={<TextInput.Icon icon="lock" color={COLORS.primary} />}
                  theme={{ colors: { primary: COLORS.primary } }}
                />
                <HelperText type="error" visible={!!errors.currentPassword}>
                  {errors.currentPassword}
                </HelperText>

                <TextInput
                  label="New Password"
                  value={passwordData.newPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                  style={styles.input}
                  error={!!errors.newPassword}
                  secureTextEntry
                  left={<TextInput.Icon icon="lock-plus" color={COLORS.primary} />}
                  theme={{ colors: { primary: COLORS.primary } }}
                />
                <HelperText type="error" visible={!!errors.newPassword}>
                  {errors.newPassword}
                </HelperText>

                <TextInput
                  label="Confirm New Password"
                  value={passwordData.confirmPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                  style={styles.input}
                  error={!!errors.confirmPassword}
                  secureTextEntry
                  left={<TextInput.Icon icon="lock-check" color={COLORS.primary} />}
                  theme={{ colors: { primary: COLORS.primary } }}
                />
                <HelperText type="error" visible={!!errors.confirmPassword}>
                  {errors.confirmPassword}
                </HelperText>

                <Button
                  mode="contained"
                  onPress={handleChangePassword}
                  loading={loading}
                  disabled={loading}
                  style={styles.submitButton}
                  icon="key"
                  buttonColor={COLORS.secondary}
                  contentStyle={{ paddingVertical: 8 }}
                >
                  Update Password
                </Button>
              </>
            )}
          </ModernCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatar: {
    backgroundColor: COLORS.primary,
    marginBottom: 8,
  },
  cameraButton: {
    position: 'absolute',
    right: '35%',
    bottom: 8,
  },
  avatarSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: COLORS.primary,
  },
  input: {
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  submitButton: {
    marginTop: 20,
    borderRadius: 16,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: COLORS.border,
  },
});

export default EditProfileScreen;

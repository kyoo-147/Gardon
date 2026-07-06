import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { MqttProvider } from './src/context/MqttContext';
import { ChatBotProvider } from './src/context/ChatBotContext';
import { AuthStackNavigator, MqttSelectionNavigator } from './src/navigation/AppNavigator';
import socketService from './src/services/socket';
import { COLORS } from './src/constants';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    primaryContainer: COLORS.primaryDark,
    secondary: COLORS.secondary,
    background: COLORS.background,
    surface: COLORS.surface,
    error: COLORS.error,
    onPrimary: COLORS.onPrimary,
    onSecondary: COLORS.onSecondary,
    onBackground: COLORS.onBackground,
    onSurface: COLORS.onSurface,
    onError: COLORS.onError,
  },
};

// App Content Component
const AppContent = () => {
  const { isAuthenticated, isLoading, token } = useAuth();

  useEffect(() => {
    // Connect socket when user is authenticated
    if (isAuthenticated && token) {
      socketService.connect(token);
    } else {
      socketService.disconnect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, token]);

  if (isLoading) {
    // You can create a loading screen component here
    return null;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <MqttProvider>
          <ChatBotProvider>
            <MqttSelectionNavigator />
          </ChatBotProvider>
        </MqttProvider>
      ) : (
        <AuthStackNavigator />
      )}
    </NavigationContainer>
  );
};

// Main App Component
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <StatusBar style="auto" />
          <AppContent />
          <Toast />
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

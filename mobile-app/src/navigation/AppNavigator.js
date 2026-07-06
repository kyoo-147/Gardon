import React, { useState } from 'react';
import { View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { IconButton, Badge, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useMqtt } from '../context/MqttContext';
import { useChatBot } from '../context/ChatBotContext';
import EasyChatBot from '../components/EasyChatBot';
import CustomTabBar from '../components/CustomTabBar';

// Import screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import DevicesScreen from '../screens/devices/DevicesScreen';
import MqttConfigScreen from '../screens/mqtt/MqttConfigScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AddDeviceScreen from '../screens/devices/AddDeviceScreenNew';
import EditDeviceScreen from '../screens/devices/EditDeviceScreen';
import DeviceDetailScreen from '../screens/devices/DeviceDetailScreen';
import AddMqttConfigScreen from '../screens/mqtt/AddMqttConfigScreen';
import EditMqttConfigScreen from '../screens/mqtt/EditMqttConfigScreen';
import MqttTestScreen from '../screens/mqtt/MqttTestScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import CustomDrawerContent from '../components/CustomDrawerContent';
// Social screens
import MqttRequestsScreen from '../screens/social/MqttRequestsScreen';
import JoinMqttScreen from '../screens/social/JoinMqttScreen';
import ChatScreen from '../screens/social/ChatScreen';
import FindFriendsScreen from '../screens/social/FindFriendsScreen';
import ChatConversationScreen from '../screens/social/ChatConversationScreen';
// import CallScreen from '../screens/social/CallScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Auth Stack Navigator
export const AuthStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

// Dashboard Stack Navigator
const DashboardStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Remove headers to save space
      }}
    >
      <Stack.Screen 
        name="DashboardMain" 
        component={DashboardScreen}
      />
    </Stack.Navigator>
  );
};

// Devices Stack Navigator
const DevicesStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Remove headers to save space
      }}
    >
      <Stack.Screen 
        name="DevicesMain" 
        component={DevicesScreen}
      />
      <Stack.Screen 
        name="AddDevice" 
        component={AddDeviceScreen}
      />
      <Stack.Screen 
        name="EditDevice" 
        component={EditDeviceScreen}
      />
      <Stack.Screen 
        name="DeviceDetail" 
        component={DeviceDetailScreen}
      />
    </Stack.Navigator>
  );
};

// MQTT Config Stack Navigator
const MqttStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Remove headers to save space
      }}
    >
      <Stack.Screen 
        name="MqttConfigMain" 
        component={MqttConfigScreen}
      />
      <Stack.Screen 
        name="AddMqttConfig" 
        component={AddMqttConfigScreen}
      />
      <Stack.Screen 
        name="EditMqttConfig" 
        component={EditMqttConfigScreen}
      />
      <Stack.Screen 
        name="MqttTest" 
        component={MqttTestScreen}
      />
    </Stack.Navigator>
  );
};

// Profile Stack Navigator
const ProfileStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Remove headers to save space
      }}
    >
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
      />
    </Stack.Navigator>
  );
};

// Social Stack Navigator
const SocialStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="ChatMain" 
        component={ChatScreen}
      />
      <Stack.Screen 
        name="ChatConversation" 
        component={ChatConversationScreen}
      />
      <Stack.Screen 
        name="FindFriends" 
        component={FindFriendsScreen}
      />
    </Stack.Navigator>
  );
};

// Main Tab Navigator with Chatbot Integration
export const MainTabNavigator = () => {
  const theme = useTheme();
  const { isVisible, toggleChatBot, unreadCount } = useChatBot();
  const [tabBarVisible, setTabBarVisible] = React.useState(true);

  return (
    <LinearGradient
      colors={[
        '#767E67', // Light gray
        '#4C533E', // Medium light gray
        '#3C3C40', // Medium gray
        '#3C3C40'  // Darker gray
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <Tab.Navigator
        tabBar={(props) => {
          // Hide tabbar for certain screens
          const currentRoute = props.state.routes[props.state.index];
          const nestedState = currentRoute.state;
          
          if (nestedState) {
            const nestedRoute = nestedState.routes[nestedState.index];
            
            // Check if current screen should hide TabBar
            const shouldHideTabBar = [
              'DeviceDetail', 
              'AddDevice', 
              'EditDevice', 
              'AddMqttConfig', 
              'EditMqttConfig', 
              'MqttTest', 
              'EditProfile'
            ].includes(nestedRoute.name);
            
            if (shouldHideTabBar) {
              return null; // Hide TabBar completely
            }
          }
          
          return (
            <CustomTabBar
              {...props}
              onChatBotPress={toggleChatBot}
              unreadCount={unreadCount}
            />
          );
        }}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardStackNavigator}
          options={{ title: 'Bảng điều khiển' }}
        />
        <Tab.Screen 
          name="Devices" 
          component={DevicesStackNavigator}
          options={{ title: 'Thiết bị' }}
        />
        <Tab.Screen 
          name="MQTT" 
          component={MqttStackNavigator}
          options={{ title: 'MQTT' }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileStackNavigator}
          options={{ title: 'Hồ sơ' }}
        />
      </Tab.Navigator>
      
      {/* Chatbot Component */}
      <EasyChatBot 
        isVisible={isVisible} 
        onClose={() => toggleChatBot()} 
      />
    </LinearGradient>
  );
};

// Main Drawer Navigator - Full Screen with No Headers
export const MainDrawerNavigator = () => {
  const theme = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false, // Remove all headers for full screen
        drawerStyle: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)', // Dark transparent drawer
          width: 280, // Reduced width
        },
        drawerActiveTintColor: '#8BC34A', // Garden theme
        drawerInactiveTintColor: 'rgba(255, 255, 255, 0.7)',
        drawerType: 'overlay', // Overlay instead of permanent
      }}
    >
      <Drawer.Screen 
        name="MainTabs" 
        component={MainTabNavigator}
        options={{
          title: 'Bảng điều khiển IoT',
          drawerIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Drawer.Screen 
        name="Dashboard" 
        component={DashboardStackNavigator}
        options={{
          title: 'Bảng điều khiển',
          drawerIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'speedometer' : 'speedometer-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Drawer.Screen 
        name="Devices" 
        component={DevicesStackNavigator}
        options={{
          title: 'Thiết bị',
          drawerIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'phone-portrait' : 'phone-portrait-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Drawer.Screen 
        name="Chat" 
        component={SocialStackNavigator}
        options={{
          title: 'Tin nhắn',
          drawerIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Drawer.Screen 
        name="MqttRequests" 
        component={MqttRequestsScreen}
        options={{
          title: 'Yêu cầu tham gia',
          drawerIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'person-add' : 'person-add-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Drawer.Screen 
        name="JoinMqtt" 
        component={JoinMqttScreen}
        options={{
          title: 'Tham gia mạng',
          drawerIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'enter' : 'enter-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileStackNavigator}
        options={{
          title: 'Hồ sơ',
          drawerIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

// MQTT Selection Navigator - handles initial MQTT selection flow
export const MqttSelectionNavigator = () => {
  const theme = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* First: MQTT Configuration Screen for selection */}
      <Stack.Screen 
        name="MqttSelection" 
        component={MqttConfigScreen}
      />
      
      {/* After connection: Main App with Drawer and Tabs */}
      <Stack.Screen 
        name="MainApp" 
        component={MainDrawerNavigator}
      />
      
      {/* MQTT Config management screens */}
      <Stack.Screen 
        name="AddMqttConfig" 
        component={AddMqttConfigScreen}
        options={{
          headerShown: false, // Remove header to save space
        }}
      />
      <Stack.Screen 
        name="EditMqttConfig" 
        component={EditMqttConfigScreen}
        options={{
          headerShown: false, // Remove header to save space
        }}
      />
      <Stack.Screen 
        name="MqttTest" 
        component={MqttTestScreen}
        options={{
          headerShown: false, // Remove header to save space
        }}
      />
      
      {/* Social screens */}
      <Stack.Screen 
        name="MqttRequests" 
        component={MqttRequestsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="JoinMqtt" 
        component={JoinMqttScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="ChatConversation" 
        component={ChatConversationScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="FindFriends" 
        component={FindFriendsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

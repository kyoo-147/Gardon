import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Dimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Path } from 'react-native-svg';
import { Badge, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const CustomTabBar = ({ state, descriptors, navigation, onChatBotPress, unreadCount = 0 }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  // TabBar dimensions - Tối ưu kích thước
  const tabBarHeight = 65; // Giảm chiều cao
  const totalHeight = tabBarHeight + insets.bottom;
  const centerRadius = 30; // Giảm kích thước center button
  const notchWidth = centerRadius * 2.2;

  // SVG Path cho lõm giữa (notch) - Clean design, không bo góc
  const createNotchPath = () => {
    const centerX = width / 2;
    const notchHalfWidth = notchWidth / 2;
    const curveRadius = 25;
    const notchDepth = 15;
    
    return `
      M0,0
      L${centerX - notchHalfWidth - curveRadius},0
      C${centerX - notchHalfWidth - curveRadius/2},0 ${centerX - notchHalfWidth - 5},5 ${centerX - notchHalfWidth + 5},${notchDepth}
      Q${centerX - 15},${notchDepth + 10} ${centerX},${notchDepth + 12}
      Q${centerX + 15},${notchDepth + 10} ${centerX + notchHalfWidth - 5},${notchDepth}
      C${centerX + notchHalfWidth + 5},5 ${centerX + notchHalfWidth + curveRadius/2},0 ${centerX + notchHalfWidth + curveRadius},0
      L${width},0
      L${width},${tabBarHeight}
      L0,${tabBarHeight}
      Z
    `;
  };

  const getTabIcon = (routeName, focused) => {
    switch (routeName) {
      case 'Dashboard':
        return focused ? 'home' : 'home-outline';
      case 'Devices':
        return focused ? 'grid' : 'grid-outline';
      case 'MQTT':
        return focused ? 'wifi' : 'wifi-outline';
      case 'Profile':
        return focused ? 'settings' : 'settings-outline';
      default:
        return 'help-outline';
    }
  };

  const getTabLabel = (routeName) => {
    switch (routeName) {
      case 'Dashboard': return 'Trang chủ';
      case 'Devices': return 'Thiết bị';
      case 'MQTT': return 'Kết nối';
      case 'Profile': return 'Cài đặt';
      default: return routeName;
    }
  };

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      {/* SVG Background với lõm giữa - Full width, sát cuối */}
      <Svg 
        width={width} 
        height={tabBarHeight + 10} 
        style={StyleSheet.absoluteFill}
      >
        <Path 
          fill="rgba(40, 40, 42, 0.95)" // Dark garden theme background
          d={createNotchPath()} 
        />
      </Svg>

      {/* Glassmorphism overlay */}
      <View style={[styles.glassOverlay, { height: tabBarHeight }]} />

      {/* Tab Items - Tối ưu cho 4 tabs + center button */}
      <View style={[styles.tabContainer, { paddingBottom: insets.bottom, height: totalHeight }]}>
        {/* Left tabs: Dashboard, Devices */}
        <View style={styles.leftTabs}>
          {state.routes.slice(0, 2).map((route, index) => {
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                style={styles.tabItem}
              >
                <View style={styles.tabContent}>
                  <Ionicons
                    name={getTabIcon(route.name, isFocused)}
                    size={22}
                    color={isFocused ? '#8BC34A' : 'rgba(255, 255, 255, 0.7)'}
                  />
                  <Text style={[
                    styles.tabLabel,
                    { color: isFocused ? '#8BC34A' : 'rgba(255, 255, 255, 0.7)' }
                  ]}>
                    {getTabLabel(route.name)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Center space for AI button */}
        <View style={styles.centerSpace} />

        {/* Right tabs: MQTT, Profile */}
        <View style={styles.rightTabs}>
          {state.routes.slice(2, 4).map((route, index) => {
            const isFocused = state.index === (index + 2);

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                style={styles.tabItem}
              >
                <View style={styles.tabContent}>
                  <Ionicons
                    name={getTabIcon(route.name, isFocused)}
                    size={22}
                    color={isFocused ? '#8BC34A' : 'rgba(255, 255, 255, 0.7)'}
                  />
                  <Text style={[
                    styles.tabLabel,
                    { color: isFocused ? '#8BC34A' : 'rgba(255, 255, 255, 0.7)' }
                  ]}>
                    {getTabLabel(route.name)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Center Button - AI Assistant tối ưu */}
      <TouchableOpacity
        onPress={onChatBotPress}
        style={[
          styles.centerButton,
          {
            top: -centerRadius + 5, // Adjust for smaller size
            left: width / 2 - centerRadius,
          }
        ]}
        activeOpacity={0.8}
      >
        <View style={styles.centerButtonGlow}>
          <View style={styles.centerButtonInner}>
            <Ionicons 
              name="color-filter-outline" 
              size={24} // Smaller icon
              color="#FFFFFF" 
            />
          </View>
        </View>
        
        {/* Badge for unread messages */}
        {unreadCount > 0 && (
          <Badge
            size={18}
            style={styles.badge}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12, // Giảm padding
    paddingHorizontal: 16, // Giảm padding
  },
  leftTabs: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
    paddingRight: 8,
  },
  rightTabs: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
    paddingLeft: 8,
  },
  centerSpace: {
    width: 70, // Giảm width cho center space
    height: 1,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6, // Giảm padding
    flex: 1,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  centerButton: {
    position: 'absolute',
    width: 60, // Giảm từ 70
    height: 60, // Giảm từ 70
    // borderRadius: 30, // Giảm từ 35
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonGlow: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8BC34A', // Garden green
    alignItems: 'center',
    justifyContent: 'center',
    // elevation: 12, // Giảm shadow
    shadowColor: '#8BC34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  centerButtonInner: {
    width: 50, // Giảm từ 60
    height: 50, // Giảm từ 60
    borderRadius: 25, // Giảm từ 30
    backgroundColor: 'rgba(139, 195, 74, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export default CustomTabBar;

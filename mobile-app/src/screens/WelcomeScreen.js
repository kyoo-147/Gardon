import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  ImageBackground,
  Platform,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const sliderWidth = width - 48;
  const thumbWidth = 64;
  const maxSlide = sliderWidth - thumbWidth - 8;
  
  // Animation cho icon bounce effect
  const iconAnimationValue = useRef(new Animated.Value(0)).current;

  // Reset vị trí slider mỗi khi focus lại màn hình
  useFocusEffect(
    useCallback(() => {
      translateX.setValue(0);
      setIsUnlocked(false);
    }, [])
  );

  // Hiệu ứng animation liên tục cho icon
  useEffect(() => {
    const createBounceAnimation = () => {
      return Animated.sequence([
        Animated.timing(iconAnimationValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(iconAnimationValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]);
    };

    const loopAnimation = Animated.loop(createBounceAnimation(), {
      iterations: -1, // Lặp vô hạn
    });

    loopAnimation.start();

    return () => loopAnimation.stop();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        console.log('onStartShouldSetPanResponder called');
        return true;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        console.log('onMoveShouldSetPanResponder:', gestureState.dx);
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        console.log('onPanResponderMove:', gestureState.dx);
        const newValue = Math.max(0, Math.min(maxSlide, gestureState.dx));
        translateX.setValue(newValue);
        const progress = newValue / maxSlide;
        setIsUnlocked(progress > 0.7);
      },
      onPanResponderRelease: (_, gestureState) => {
        console.log('onPanResponderRelease:', gestureState.dx, 'maxSlide:', maxSlide);
        const progress = translateX._value / maxSlide;
        if (progress > 0.8) {
          Animated.timing(translateX, {
            toValue: maxSlide,
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            setTimeout(() => navigation.navigate('Login'), 300);
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            tension: 120,
            friction: 8,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ImageBackground
        source={{ uri: 'https://plus.unsplash.com/premium_photo-1676625176020-3bbb1c0adea1?q=80&w=687&auto=format&fit=crop' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.textSection}>
              <Text style={styles.mainText}>
                Kiểm soát{'\n'}
                toàn diện{'\n'}
                cho ngôi{'\n'}
                nhà thông{'\n'}
                minh của{'\n'}
                bạn
              </Text>
            </View>

            <View style={styles.sliderSection}>
              <View style={styles.sliderContainer}>
                <View style={styles.sliderTrack}>
                  {/* Text nằm giữa */}
                  <View style={styles.centerTextContainer}>
                    <Text style={styles.sliderText}>
                      {isUnlocked ? 'Enjoy!!!' : 'Bắt đầu'}
                    </Text>
                  </View>
                  
                  {/* Icon sát mép phải */}
                  <Animated.View style={[
                    styles.arrowIconContainer,
                    {
                      transform: [{
                        translateX: iconAnimationValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 8], // Di chuyển 8px qua phải
                        })
                      }],
                      opacity: iconAnimationValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.6, 1], // Thay đổi độ trong suốt
                      })
                    }
                  ]}>
                    <Ionicons
                      name="chevron-forward-outline"
                      size={26}
                      color="rgba(255,255,255,0.9)"
                      style={styles.arrowIcon}
                    />
                  </Animated.View>
                </View>

                <Animated.View
                  {...panResponder.panHandlers}
                  style={[
                    styles.sliderThumb,
                    { transform: [{ translateX }] },
                  ]}
                >
                  <Ionicons
                    name={isUnlocked ? 'lock-open' : 'lock-closed'}
                    size={28}
                    color="#FFFFFF"
                  />
                </Animated.View>
              </View>
            </View>

            {/* Footer Section - Nhận diện thương hiệu */}
            <View style={styles.footerSection}>
              <Text style={styles.footerText}>
                Powered by <Text style={styles.footerBrand}>StarByte Software</Text>
              </Text>
              <Text style={styles.footerSubText}>
                cùng với <Text style={styles.footerPartner}>LyLy Agent Home</Text>
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

// Giữ nguyên toàn bộ phần styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 60,
  },
  textSection: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 40,
  },
  mainText: {
    fontSize: 42, // tăng từ 38 → 42
    fontWeight: '500', // tăng từ '400' để sắc nét hơn
    color: '#FFFFFF',
    lineHeight: 50, // tăng theo fontSize
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: 0.75, // tăng từ 0.5 cho rõ ràng hơn
  },
  sliderSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  sliderContainer: {
    position: 'relative',
    width: width - 48,
  },
  sliderTrack: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 35,
    height: 70,
    position: 'relative', // Để có thể position absolute cho icon
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  centerTextContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Text nằm trên
  },
  sliderText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    textAlign: 'center',
  },
  arrowIconContainer: {
    position: 'absolute',
    right: 20, // Sát mép phải, cách mép 20px
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2, // Icon nằm trên text
  },
  arrowIcon: { 
    // Icon sẽ có animation riêng
  },
  sliderThumb: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#8BC34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10, // Cao nhất để có thể tương tác
  },
  
  // Footer Section - Nhận diện thương hiệu
  footerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  footerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  footerBrand: {
    fontWeight: 'bold',
    color: '#8BC34A', // Màu xanh garden theme
  },
  footerSubText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '300',
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  footerPartner: {
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

export default WelcomeScreen;

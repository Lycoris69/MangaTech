import React, { useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Logo3D from '../components/Logo3D';
import { HolographicText } from '../components/ui';
import { colors, gradients, spacing } from '../styles/theme';

const { height } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
    
    // Auto-dismiss after 2.5 seconds
    const timeout = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, 2500);
    
    return () => clearTimeout(timeout);
  }, []);
  
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });
  
  return (
    <LinearGradient
      colors={[colors.black, colors.darkGray, colors.black]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        {/* Animated glow ring */}
        <Animated.View 
          style={[
            styles.glowRing,
            {
              opacity: glowOpacity,
              transform: [
                { scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.2],
                })}
              ],
            }
          ]}
        >
          <View style={styles.glowCircle} />
        </Animated.View>
        
        {/* 3D Logo */}
        <View style={styles.logoContainer}>
          <Logo3D size={180} />
        </View>
        
        {/* App Name */}
        <View style={styles.textContainer}>
          <HolographicText 
            fontSize={48} 
            fontWeight="900"
            glow
          >
            MangaTech
          </HolographicText>
        </View>
      </Animated.View>
      
      {/* Bottom accent */}
      <View style={styles.bottomAccent}>
        <View style={styles.accentLine} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.black,
  },
  
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  glowRing: {
    position: 'absolute',
    top: -40,
  },
  
  glowCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 2,
    borderColor: colors.purple.neon,
    backgroundColor: 'transparent',
    shadowColor: colors.purple.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
  },
  
  logoContainer: {
    marginBottom: spacing.xl,
  },
  
  textContainer: {
    marginTop: spacing.lg,
  },
  
  bottomAccent: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  
  accentLine: {
    width: 100,
    height: 3,
    backgroundColor: colors.purple.neon,
    borderRadius: 2,
    shadowColor: colors.purple.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
});

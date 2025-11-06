import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, borderRadius, shadows } from '../../styles/theme';

/**
 * NeonCard - Card component with neon glow effects
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {'purple'|'cyan'|'pink'|'none'} props.glowColor - Glow effect color
 * @param {boolean} props.gradient - Use gradient background
 * @param {Object} props.style - Additional styles
 */
export default function NeonCard({ 
  children, 
  glowColor = 'purple', 
  gradient = true,
  style,
  ...props 
}) {
  const glowStyle = glowColor !== 'none' ? shadows[`${glowColor}Glow`] : {};
  
  if (gradient) {
    return (
      <View style={[styles.container, glowStyle, style]} {...props}>
        <LinearGradient
          colors={gradients.card}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {children}
        </LinearGradient>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, styles.solid, glowStyle, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  
  gradient: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
    borderRadius: borderRadius.lg,
  },
  
  solid: {
    backgroundColor: colors.gray,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
  },
});

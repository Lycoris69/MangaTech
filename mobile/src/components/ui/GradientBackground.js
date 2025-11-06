import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../../styles/theme';

/**
 * GradientBackground - Background with gradient
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content
 * @param {'dark'|'primary'|'neon'} props.variant - Gradient variant
 */
export default function GradientBackground({ 
  children, 
  variant = 'dark',
  ...props 
}) {
  return (
    <LinearGradient
      colors={gradients[variant]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      {...props}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { gradients, typography, shadows } from '../../styles/theme';

/**
 * HolographicText - Text with holographic gradient effect
 * @param {Object} props
 * @param {string} props.children - Text content
 * @param {number} props.fontSize - Font size
 * @param {string} props.fontWeight - Font weight
 * @param {boolean} props.glow - Add glow effect
 * @param {Object} props.style - Additional styles
 */
export default function HolographicText({ 
  children, 
  fontSize = typography.sizes.xxl,
  fontWeight = typography.weights.bold,
  glow = false,
  style,
  ...props 
}) {
  return (
    <MaskedView
      maskElement={
        <Text 
          style={[
            styles.text, 
            { fontSize, fontWeight },
            style
          ]}
          {...props}
        >
          {children}
        </Text>
      }
    >
      <LinearGradient
        colors={gradients.holographic}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, glow && shadows.purpleGlow]}
      >
        <Text 
          style={[
            styles.text, 
            styles.transparent,
            { fontSize, fontWeight },
            style
          ]}
          {...props}
        >
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: 'center',
  },
  
  gradient: {
    flex: 1,
  },
  
  transparent: {
    opacity: 0,
  },
});

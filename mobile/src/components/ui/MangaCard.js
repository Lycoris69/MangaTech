import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, borderRadius, shadows, typography, spacing } from '../../styles/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.md * 3) / 2; // 2 columns with gaps
const CARD_HEIGHT = CARD_WIDTH * 1.5; // 2:3 aspect ratio

/**
 * MangaCard - Abstract manga card with neon effects
 * @param {Object} props
 * @param {string} props.title - Manga title
 * @param {Function} props.onPress - Press handler
 * @param {boolean} props.isRecent - Show as recent (different glow)
 */
export default function MangaCard({ 
  title = 'Manga Title',
  onPress,
  isRecent = false,
  ...props 
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.container,
        isRecent ? shadows.cyanGlow : shadows.purpleGlow
      ]}
      {...props}
    >
      <LinearGradient
        colors={isRecent ? [colors.cyan.dark, colors.purple.dark] : gradients.card}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Abstract placeholder pattern */}
        <View style={styles.pattern}>
          <View style={[styles.patternLine, { top: '20%', opacity: 0.3 }]} />
          <View style={[styles.patternLine, { top: '40%', opacity: 0.5 }]} />
          <View style={[styles.patternLine, { top: '60%', opacity: 0.3 }]} />
        </View>
        
        {/* Neon border */}
        <View style={[
          styles.border,
          { borderColor: isRecent ? colors.cyan.neon : colors.purple.neon }
        ]} />
      </LinearGradient>
      
      {/* Title overlay */}
      <View style={styles.overlay}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
    position: 'relative',
  },
  
  pattern: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.lg,
  },
  
  patternLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.purple.neon,
  },
  
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
    backgroundColor: 'rgba(10, 10, 15, 0.8)',
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  
  title: {
    color: colors.text.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
});

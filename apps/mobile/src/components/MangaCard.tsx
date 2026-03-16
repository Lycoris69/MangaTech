import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SeriesSearchResult } from '../types';
import { COLORS, FONTS, GLOBS } from '../constants/theme';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

interface MangaCardProps {
  manga: SeriesSearchResult;
  onPress: (id: string) => void;
}

export const MangaCard: React.FC<MangaCardProps> = ({ manga, onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(manga.id)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[COLORS.cardBg, COLORS.cardBgAlt]}
        style={styles.gradient}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: manga.coverImageUrl }} 
            style={styles.image}
            resizeMode="cover"
          />
          {manga.rating > 0 && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {manga.rating.toFixed(1)}</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(10,10,15,0.8)']}
            style={styles.imageOverlay}
          />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {manga.title}
          </Text>
          {manga.latestChapter && (
            <Text style={styles.latestChapter}>
              {manga.latestChapter}
            </Text>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: COLUMN_WIDTH,
    marginBottom: 16,
    borderRadius: GLOBS.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  gradient: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2/3,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    zIndex: 2,
  },
  ratingText: {
    color: COLORS.cyan,
    fontSize: 10,
    fontFamily: FONTS.heading,
    textShadowColor: COLORS.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  infoContainer: {
    padding: 10,
  },
  title: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.bodySemiBold,
    lineHeight: 18,
    marginBottom: 4,
  },
  latestChapter: {
    fontSize: 12,
    color: COLORS.primaryBright,
    fontFamily: FONTS.body,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

import React, { useState, useRef } from 'react';
import { 
  View, 
  FlatList,
  Image,
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground, NeonCard } from '../components/ui';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReaderScreen({ route, navigation }) {
  const { chapterId = 1 } = route.params || {};
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);
  
  // Mock pages data
  const pages = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    pageNumber: i + 1,
    imageUrl: `https://via.placeholder.com/800x1200/9333EA/FFFFFF?text=Page+${i + 1}`,
  }));
  
  const totalPages = pages.length;
  
  const handlePreviousChapter = () => {
    // Navigate to previous chapter
    console.log('Previous chapter');
  };
  
  const handleNextChapter = () => {
    // Navigate to next chapter
    console.log('Next chapter');
  };
  
  const handlePageChange = (index) => {
    setCurrentPage(index + 1);
  };
  
  const renderPage = ({ item }) => (
    <View style={styles.pageContainer}>
      <View style={[styles.imagePlaceholder, shadows.purpleGlow]}>
        {/* Abstract page placeholder */}
        <View style={styles.pagePattern}>
          <View style={[styles.patternBlock, { top: '10%', left: '10%' }]} />
          <View style={[styles.patternBlock, { top: '30%', right: '10%' }]} />
          <View style={[styles.patternBlock, { bottom: '20%', left: '20%' }]} />
        </View>
        <Text style={styles.pageNumber}>Page {item.pageNumber}</Text>
      </View>
    </View>
  );
  
  return (
    <GradientBackground variant="dark">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.purple.neon} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Chapter {chapterId}</Text>
          
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={24} color={colors.purple.neon} />
          </TouchableOpacity>
        </View>
        
        {/* Pages FlatList */}
        <FlatList
          ref={flatListRef}
          data={pages}
          renderItem={renderPage}
          keyExtractor={(item) => item.id.toString()}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={({ viewableItems }) => {
            if (viewableItems.length > 0) {
              handlePageChange(viewableItems[0].index);
            }
          }}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
          }}
        />
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(currentPage / totalPages) * 100}%` }
              ]} 
            />
          </View>
        </View>
        
        {/* Bottom Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            onPress={handlePreviousChapter}
            style={styles.controlButton}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
            <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          
          <View style={styles.pageIndicator}>
            <Text style={styles.pageText}>
              {currentPage} / {totalPages}
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={handleNextChapter}
            style={styles.controlButton}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text.primary} />
            <Ionicons name="chevron-forward" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray,
    borderWidth: 1,
    borderColor: colors.purple.neon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  
  pageContainer: {
    height: SCREEN_HEIGHT - 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  
  imagePlaceholder: {
    width: '100%',
    height: '95%',
    backgroundColor: colors.gray,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.purple.neon,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  
  pagePattern: {
    ...StyleSheet.absoluteFillObject,
  },
  
  patternBlock: {
    position: 'absolute',
    width: 100,
    height: 100,
    backgroundColor: colors.purple.dark,
    opacity: 0.3,
    borderRadius: borderRadius.md,
  },
  
  pageNumber: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.purple.neon,
  },
  
  progressContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  
  progressBar: {
    height: 4,
    backgroundColor: colors.gray,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: colors.purple.neon,
    ...shadows.purpleGlow,
  },
  
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.purple.neon,
    minWidth: 80,
  },
  
  pageIndicator: {
    backgroundColor: colors.gray,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cyan.neon,
  },
  
  pageText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
});

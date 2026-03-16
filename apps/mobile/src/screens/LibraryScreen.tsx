import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Star, Download, ChevronRight } from 'lucide-react-native';
import { MangaApi } from '../services/api';
import { UserLibrary, SeriesSearchResult, ReadingProgress } from '../types';
import { MangaCard } from '../components/MangaCard';
import { COLORS, FONTS, GLOBS } from '../constants/theme';

const { width } = Dimensions.get('window');

export const LibraryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [library, setLibrary] = useState<UserLibrary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoritesMetadata, setFavoritesMetadata] = useState<SeriesSearchResult[]>([]);

  const fetchLibrary = useCallback(async () => {
    try {
      const data = await MangaApi.getLibrary();
      setLibrary(data);

      const allSeriesIds = new Set<string>();
      data.favorites?.forEach(f => allSeriesIds.add(f.seriesId));
      data.downloads?.forEach(d => allSeriesIds.add(d.seriesId));
      data.readingProgress?.forEach(p => allSeriesIds.add(p.seriesId));

      if (allSeriesIds.size > 0) {
        const metadataPromises = Array.from(allSeriesIds).map(id => MangaApi.getSeriesDetails(id));
        const metadata = await Promise.all(metadataPromises);
        setFavoritesMetadata(metadata as any);
      } else {
        setFavoritesMetadata([]);
      }
    } catch (error) {
      console.error('Failed to fetch library:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLibrary();
  };

  const handleMangaPress = (id: string) => {
    navigation.navigate('SeriesDetails', { id });
  };

  const handleContinueReading = (progress: ReadingProgress) => {
    navigation.navigate('Reader', {
      chapterId: progress.chapterId,
      seriesId: progress.seriesId,
      initialPage: progress.pageNumber
    });
  };

  const recentReading = useMemo(() => {
    if (!library?.readingProgress) return [];
    
    // Sort by date descending
    const sorted = [...library.readingProgress].sort((a, b) => 
      new Date(b.lastReadDate).getTime() - new Date(a.lastReadDate).getTime()
    );

    // Filter for unique series, limit to 3
    const unique: ReadingProgress[] = [];
    const seen = new Set<string>();
    
    for (const item of sorted) {
      if (!seen.has(item.seriesId)) {
        seen.add(item.seriesId);
        unique.push(item);
      }
      if (unique.length === 3) break;
    }
    
    return unique;
  }, [library?.readingProgress]);

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primaryBright} />
      </View>
    );
  }

  const renderProgressItem = (item: ReadingProgress) => {
    const seriesMeta = favoritesMetadata.find(m => m.id === item.seriesId);
    return (
      <TouchableOpacity 
        key={`${item.seriesId}-${item.chapterId}`}
        style={styles.progressCard}
        onPress={() => handleContinueReading(item)}
      >
        <Image 
          source={{ uri: seriesMeta?.coverImageUrl || 'https://via.placeholder.com/150' }} 
          style={styles.progressCover} 
        />
        <View style={styles.progressInfo}>
          <Text style={styles.progressTitle} numberOfLines={1}>
            {seriesMeta?.title || item.seriesId}
          </Text>
          <Text style={styles.progressChapter}>
            CHAPTER {item.chapterId.split('/').pop()?.replace('chapter-', '') || item.chapterId}
          </Text>
          <Text style={styles.progressDate}>
            SYNCED: {new Date(item.lastReadDate).toLocaleDateString()}
          </Text>
        </View>
        <ChevronRight size={20} color={COLORS.textSecondary} style={styles.progressChevron} />
      </TouchableOpacity>
    );
  };

  const isEmpty = !library || (library.favorites.length === 0 && library.downloads.length === 0 && library.readingProgress.length === 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.cyan} 
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>NEURAL ARCHIVE</Text>
          <View style={styles.headerUnderline} />
        </View>

        {recentReading.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <BookOpen size={18} color={COLORS.primaryBright} />
              <Text style={styles.sectionTitle}>CONTINUE SYNCING</Text>
            </View>
            <View style={styles.progressList}>
              {recentReading.map(renderProgressItem)}
            </View>
          </View>
        )}

        {favoritesMetadata.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Star size={18} color={COLORS.primaryBright} />
              <Text style={styles.sectionTitle}>FAVORITE NODES</Text>
            </View>
            <View style={styles.grid}>
              {library?.favorites.map(fav => {
                const meta = favoritesMetadata.find(m => m.id === fav.seriesId);
                if (!meta) return null;
                return (
                  <MangaCard 
                    key={fav.seriesId} 
                    manga={meta} 
                    onPress={handleMangaPress} 
                  />
                );
              })}
            </View>
          </View>
        )}

        {(library?.downloads && library.downloads.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleContainer}>
                <Download size={18} color={COLORS.primaryBright} />
                <Text style={styles.sectionTitle}>OFFLINE CORES</Text>
              </View>
              <TouchableOpacity 
                style={styles.manageButton}
                onPress={() => navigation.navigate('Downloads')}
              >
                <Text style={styles.manageButtonText}>MANAGE</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.grid}>
              {library.downloads.map(download => {
                const meta = favoritesMetadata.find(m => m.id === download.seriesId);
                return (
                  <MangaCard 
                    key={download.seriesId} 
                    manga={meta || {
                      id: download.seriesId,
                      title: download.seriesId,
                      coverImageUrl: 'https://via.placeholder.com/150',
                      author: 'Unknown',
                      synopsis: '',
                      genres: [],
                      status: 'ongoing' as any,
                      rating: 0,
                      sourceUrl: ''
                    }} 
                    onPress={handleMangaPress} 
                  />
                );
              })}
            </View>
          </View>
        )}

        {isEmpty && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>YOUR ARCHIVE IS DEVOID OF DATA.</Text>
            <TouchableOpacity 
              style={styles.exploreButton}
              onPress={() => navigation.navigate('Home')}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryBright]}
                style={styles.exploreGradient}
              >
                <Text style={styles.exploreButtonText}>EXPLORE DATA-STREAMS</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    padding: GLOBS.padding,
    paddingTop: 16,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FONTS.headingBlack,
    color: '#FFF',
    letterSpacing: 2,
  },
  headerUnderline: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.cyan,
    marginTop: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.heading,
    color: COLORS.primaryBright,
    marginLeft: 10,
    letterSpacing: 1.5,
  },
  manageButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
  },
  manageButtonText: {
    color: COLORS.cyan,
    fontSize: 10,
    fontFamily: FONTS.heading,
    letterSpacing: 1,
  },
  progressList: {
    paddingHorizontal: 16,
  },
  progressCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: GLOBS.borderRadius,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  progressCover: {
    width: 60,
    height: 80,
  },
  progressInfo: {
    flex: 1,
    padding: 12,
  },
  progressTitle: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: '#FFF',
    marginBottom: 2,
  },
  progressChapter: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.cyan,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  progressDate: {
    fontSize: 10,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    opacity: 0.6,
  },
  progressChevron: {
    marginRight: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GLOBS.padding / 2,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginBottom: 30,
    textAlign: 'center',
    letterSpacing: 1,
  },
  exploreButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  exploreGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  exploreButtonText: {
    color: '#FFF',
    fontFamily: FONTS.heading,
    fontSize: 14,
    letterSpacing: 1,
  },
});

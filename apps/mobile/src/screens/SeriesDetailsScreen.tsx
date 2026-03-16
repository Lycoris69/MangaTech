import React, { useEffect, useState, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Download, ChevronLeft, ArrowUpDown, ChevronDown } from 'lucide-react-native';
import { MangaApi } from '../services/api';
import { Series, ChapterInfo, UserLibrary } from '../types';
import { COLORS, FONTS, GLOBS } from '../constants/theme';

const { width } = Dimensions.get('window');

type SortOrder = 'asc' | 'desc';

export const SeriesDetailsScreen: React.FC<{ route: any, navigation: any }> = ({ route, navigation }) => {
  const { id } = route.params;
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [library, setLibrary] = useState<UserLibrary | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showAllChapters, setShowAllChapters] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [seriesData, libraryData] = await Promise.all([
          MangaApi.getSeriesDetails(id),
          MangaApi.getLibrary()
        ]);
        setSeries(seriesData);
        setLibrary(libraryData);
        setIsFavorite(libraryData.favorites.some(f => f.seriesId === id));
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const sortedChapters = useMemo(() => {
    if (!series?.chapters) return [];
    
    return [...series.chapters].sort((a, b) => {
      const numA = parseFloat(a.chapterNumber);
      const numB = parseFloat(b.chapterNumber);
      return sortOrder === 'desc' ? numB - numA : numA - numB;
    });
  }, [series?.chapters, sortOrder]);

  const displayedChapters = useMemo(() => {
    if (showAllChapters) return sortedChapters;
    return sortedChapters.slice(0, 15);
  }, [sortedChapters, showAllChapters]);

  const handleToggleFavorite = async () => {
    if (!library || !series) return;

    try {
      const newLibrary = { ...library };
      if (isFavorite) {
        newLibrary.favorites = newLibrary.favorites.filter(f => f.seriesId !== id);
      } else {
        newLibrary.favorites.push({
          seriesId: id,
          dateAdded: new Date().toISOString(),
          notificationsEnabled: true
        });
      }

      await MangaApi.saveLibrary(newLibrary);
      setLibrary(newLibrary);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleDownloadChapter = async (chapter: ChapterInfo) => {
    if (!series) return;
    try {
      await MangaApi.triggerDownload({
        seriesId: id,
        chapterId: chapter.id,
        seriesTitle: series.title,
        chapterTitle: `Chapter ${chapter.chapterNumber}`
      });
      alert('Download started!');
    } catch (error) {
      console.error('Failed to trigger download:', error);
    }
  };

  const handleDownloadAll = async () => {
    if (!series || !series.chapters) return;
    try {
      for (const chapter of series.chapters) {
        await MangaApi.triggerDownload({
          seriesId: id,
          chapterId: chapter.id,
          seriesTitle: series.title,
          chapterTitle: `Chapter ${chapter.chapterNumber}`
        });
      }
      alert('All chapters queued for download!');
    } catch (error) {
      console.error('Failed to trigger all downloads:', error);
    }
  };

  const handleChapterPress = (chapter: ChapterInfo) => {
    navigation.navigate('Reader', { 
      chapterId: chapter.id, 
      seriesId: series?.id,
      seriesTitle: series?.title,
      chapterTitle: chapter.title
    });
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primaryBright} />
      </View>
    );
  }

  if (!series) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load series details</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView>
        <View style={styles.headerContainer}>
          <Image source={{ uri: series.coverImageUrl }} style={styles.coverImage} />
          <LinearGradient
            colors={['transparent', COLORS.background]}
            style={styles.coverOverlay}
          />
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{series.title}</Text>
            <TouchableOpacity 
              onPress={handleToggleFavorite}
              style={[
                styles.favoriteButton,
                isFavorite && styles.favoriteButtonActive
              ]}
            >
              <Heart 
                size={24} 
                color={isFavorite ? '#FFF' : COLORS.textSecondary} 
                fill={isFavorite ? '#FFF' : 'transparent'} 
              />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.author}>{series.author}</Text>
          
          <View style={styles.genresContainer}>
            {series.genres.map((genre, index) => (
              <View key={index} style={styles.genreBadge}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
          
          <Text style={styles.synopsis}>{series.synopsis}</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: series.status === 'Ongoing' ? COLORS.green : COLORS.cyan }]}>
                {series.status.toUpperCase()}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{series.totalChapters}</Text>
              <Text style={styles.statLabel}>Chapters</Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{series.lastUpdated ? new Date(series.lastUpdated).getFullYear() : 'N/A'}</Text>
              <Text style={styles.statLabel}>Year</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.downloadAllButton}
              onPress={handleDownloadAll}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryBright]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.downloadAllGradient}
              >
                <Download size={20} color="#FFF" />
                <Text style={styles.downloadAllText}>Download All</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.chaptersSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Chapters</Text>
              <View style={styles.sectionTitleUnderline} />
            </View>
            <TouchableOpacity 
              style={styles.sortToggleButton}
              onPress={toggleSortOrder}
            >
              <ArrowUpDown size={20} color={COLORS.cyan} />
              <Text style={styles.sortToggleText}>
                {sortOrder === 'desc' ? 'NEWEST' : 'OLDEST'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {displayedChapters.map((chapter) => (
            <View key={chapter.id} style={styles.chapterItemContainer}>
              <TouchableOpacity 
                style={styles.chapterItem}
                onPress={() => handleChapterPress(chapter)}
              >
                <View style={styles.chapterInfo}>
                  <Text style={styles.chapterNumber}>CHAPTER {chapter.chapterNumber}</Text>
                  {chapter.title ? (
                    <Text style={styles.chapterTitle} numberOfLines={1}>{chapter.title}</Text>
                  ) : null}
                  <Text style={styles.chapterDate}>{new Date(chapter.publishDate).toLocaleDateString()}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.downloadChapterButton}
                onPress={() => handleDownloadChapter(chapter)}
              >
                <Download size={20} color={COLORS.cyan} />
              </TouchableOpacity>
            </View>
          ))}

          {!showAllChapters && sortedChapters.length > 15 && (
            <TouchableOpacity 
              style={styles.showMoreButton}
              onPress={() => setShowAllChapters(true)}
            >
              <Text style={styles.showMoreText}>SHOW {sortedChapters.length - 15} MORE CHAPTERS</Text>
              <ChevronDown size={20} color={COLORS.cyan} />
            </TouchableOpacity>
          )}
        </View>
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
  headerContainer: {
    width: width,
    height: width * 1.2,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  infoContainer: {
    padding: GLOBS.padding,
    marginTop: -80,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontFamily: FONTS.heading,
    color: '#FFF',
    textShadowColor: COLORS.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    lineHeight: 34,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  favoriteButtonActive: {
    backgroundColor: COLORS.pink,
    borderColor: COLORS.pink,
  },
  author: {
    fontSize: 18,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  genreBadge: {
    backgroundColor: 'rgba(157, 78, 221, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(157, 78, 221, 0.3)',
  },
  genreText: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.primaryBright,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  synopsis: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.text,
    lineHeight: 24,
    marginTop: 16,
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: GLOBS.borderRadius,
    padding: 16,
    marginTop: 24,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: FONTS.heading,
    color: '#FFF',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  statSeparator: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  actionRow: {
    marginTop: 24,
  },
  downloadAllButton: {
    borderRadius: GLOBS.borderRadius,
    overflow: 'hidden',
  },
  downloadAllGradient: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadAllText: {
    color: '#FFF',
    fontFamily: FONTS.heading,
    fontSize: 16,
    marginLeft: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chaptersSection: {
    padding: GLOBS.padding,
    marginTop: 16,
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: FONTS.heading,
    color: COLORS.primaryBright,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sectionTitleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.cyan,
    marginTop: 4,
  },
  sortToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sortToggleText: {
    marginLeft: 8,
    fontSize: 12,
    fontFamily: FONTS.heading,
    color: COLORS.cyan,
    letterSpacing: 1,
  },
  chapterItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  chapterItem: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  chapterInfo: {
    paddingRight: 16,
  },
  chapterNumber: {
    fontSize: 16,
    fontFamily: FONTS.heading,
    color: '#FFF',
  },
  chapterTitle: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  chapterDate: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 6,
    opacity: 0.6,
  },
  downloadChapterButton: {
    padding: 16,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.05)',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  showMoreText: {
    fontSize: 14,
    fontFamily: FONTS.heading,
    color: COLORS.cyan,
    marginRight: 10,
    letterSpacing: 1,
  },
  errorText: {
    color: COLORS.pink,
    fontSize: 16,
    fontFamily: FONTS.bodyMedium,
  },
});

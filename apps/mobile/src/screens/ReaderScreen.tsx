import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Image, 
  FlatList, 
  ActivityIndicator, 
  Dimensions,
  Text,
  StatusBar,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, List } from 'lucide-react-native';
import { MangaApi } from '../services/api';
import { PageUrl, Series, ChapterInfo } from '../types';
import { ChapterSelector } from '../components/ChapterSelector';
import { COLORS, FONTS, GLOBS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const ReaderPage: React.FC<{ 
  imageUrl: string, 
  pageNumber: number,
  initialWidth?: number,
  initialHeight?: number
}> = ({ imageUrl, pageNumber, initialWidth, initialHeight }) => {
  const [aspectRatio, setAspectRatio] = useState<number | null>(
    initialWidth && initialHeight ? initialWidth / initialHeight : null
  );

  return (
    <View style={[styles.pageContainer, aspectRatio ? { height: width / aspectRatio } : { minHeight: height }]}>
      <Image 
        source={{ uri: imageUrl }} 
        style={[styles.pageImage, aspectRatio ? { width: width, height: width / aspectRatio } : { width: width, height: height }]}
        onLoad={(event) => {
          if (!aspectRatio) {
            const { width: imgWidth, height: imgHeight } = event.nativeEvent.source;
            setAspectRatio(imgWidth / imgHeight);
          }
        }}
        resizeMode="contain"
      />
    </View>
  );
};

export const ReaderScreen: React.FC<{ route: any, navigation: any }> = ({ route, navigation }) => {
  const { chapterId, seriesId, initialPage = 1 } = route.params;
  
  const [pages, setPages] = useState<(PageUrl & { chapterId: string })[]>([]);
  const [series, setSeries] = useState<Series | null>(null);
  const [activeChapterId, setActiveChapterId] = useState(chapterId);
  const [loading, setLoading] = useState(true);
  const [loadingNext, setLoadingNext] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSeriesDetails = useCallback(async () => {
    if (!seriesId) return;
    try {
      const data = await MangaApi.getSeriesDetails(seriesId);
      setSeries(data);
    } catch (error) {
      console.error('Failed to fetch series details:', error);
    }
  }, [seriesId]);

  const fetchPages = useCallback(async (cId: string, append: boolean = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingNext(true);

      const data = await MangaApi.getChapterPages(cId);
      const pagesWithChapter = data.map(p => ({ ...p, chapterId: cId }));
      
      if (append) {
        setPages(prev => [...prev, ...pagesWithChapter]);
      } else {
        setPages(pagesWithChapter);
        setActiveChapterId(cId);
      }

      // Save progress
      if (seriesId) {
        try {
          const library = await MangaApi.getLibrary();
          const progressIndex = library.readingProgress.findIndex(p => p.seriesId === seriesId);
          const newProgress = {
            seriesId,
            chapterId: cId,
            pageNumber: append ? 1 : initialPage,
            lastReadDate: new Date().toISOString()
          };

          if (progressIndex > -1) {
            library.readingProgress[progressIndex] = newProgress;
          } else {
            library.readingProgress.push(newProgress);
          }
          await MangaApi.saveLibrary(library);
        } catch (e) {
          console.error('Failed to save progress:', e);
        }
      }
    } catch (error) {
      console.error('Failed to fetch chapter pages:', error);
    } finally {
      setLoading(false);
      setLoadingNext(false);
    }
  }, [seriesId, initialPage]);

  useEffect(() => {
    fetchSeriesDetails();
    fetchPages(chapterId);
  }, [chapterId, fetchSeriesDetails, fetchPages]);

  const loadNextChapter = useCallback(() => {
    if (loadingNext || !series?.chapters) return;

    const currentIndex = series.chapters.findIndex(c => c.id === activeChapterId);
    if (currentIndex > -1 && currentIndex < series.chapters.length - 1) {
      const nextChapter = series.chapters[currentIndex + 1];
      setActiveChapterId(nextChapter.id);
      fetchPages(nextChapter.id, true);
    }
  }, [loadingNext, series, activeChapterId, fetchPages]);

  const handleToggleControls = () => {
    setShowControls(prev => !prev);
    if (!showControls) {
      resetControlsTimeout();
    }
  };

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  };

  const handleChapterSelect = (chapter: ChapterInfo) => {
    setPages([]);
    fetchPages(chapter.id);
    setShowSelector(false);
  };

  const renderItem = ({ item }: { item: PageUrl & { chapterId: string } }) => (
    <ReaderPage 
      imageUrl={item.imageUrl} 
      pageNumber={item.pageNumber} 
      initialWidth={item.width}
      initialHeight={item.height}
    />
  );

  if (loading && pages.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primaryBright} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden={!showControls} barStyle="light-content" />
      
      {showControls && (
        <LinearGradient
          colors={['rgba(10,10,15,0.95)', 'rgba(10,10,15,0)']}
          style={styles.topBar}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <ChevronLeft size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.topBarInfo}>
            <Text style={styles.seriesTitle} numberOfLines={1}>
              {series?.title || 'Reading'}
            </Text>
            <Text style={styles.chapterTitle} numberOfLines={1}>
              CHAPTER {series?.chapters?.find(c => c.id === activeChapterId)?.chapterNumber || ''}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowSelector(true)} style={styles.iconButton}>
            <List size={24} color={COLORS.cyan} />
          </TouchableOpacity>
        </LinearGradient>
      )}

      <FlatList
        ref={flatListRef}
        data={pages}
        keyExtractor={(item, index) => `${item.chapterId}-${item.pageNumber}-${index}`}
        renderItem={renderItem}
        onEndReached={loadNextChapter}
        onEndReachedThreshold={0.5}
        onTouchStart={handleToggleControls}
        ListFooterComponent={loadingNext ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={COLORS.cyan} />
            <Text style={styles.footerText}>SYNCING NEXT CHAPTER...</Text>
          </View>
        ) : null}
      />

      {series?.chapters && (
        <ChapterSelector
          visible={showSelector}
          onClose={() => setShowSelector(false)}
          chapters={series.chapters}
          currentChapterId={activeChapterId}
          onSelect={handleChapterSelect}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  pageContainer: {
    width: width,
    backgroundColor: '#000',
  },
  pageImage: {
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    zIndex: 10,
  },
  topBarInfo: {
    flex: 1,
    paddingHorizontal: 16,
  },
  seriesTitle: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: FONTS.heading,
    textShadowColor: COLORS.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  chapterTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1,
    marginTop: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  footerLoader: {
    padding: 40,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.cyan,
    fontSize: 12,
    fontFamily: FONTS.heading,
    marginTop: 12,
    letterSpacing: 2,
  },
});

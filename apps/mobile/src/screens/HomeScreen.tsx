import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronUp } from 'lucide-react-native';
import { MangaApi } from '../services/api';
import { SeriesSearchResult } from '../types';
import { MangaCard } from '../components/MangaCard';
import { COLORS, FONTS, GLOBS } from '../constants/theme';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [series, setSeries] = useState<SeriesSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchSeries = useCallback(async (pageToFetch: number, isRefresh: boolean = false) => {
    try {
      if (pageToFetch === 1 && !isRefresh) setLoading(true);
      setError(null);
      
      const data = await MangaApi.getLatest(pageToFetch);
      
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setSeries(prev => isRefresh ? data : [...prev, ...data]);
        setHasMore(true);
      }
    } catch (error: any) {
      console.error('Failed to fetch series:', error);
      setError('Connection to neural net lost. Retrying...');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSeries(1);
  }, [fetchSeries]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: showBackToTop ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showBackToTop, fadeAnim]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchSeries(1, true);
  };

  const onLoadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSeries(nextPage);
  };

  const handleMangaPress = (id: string) => {
    navigation.navigate('SeriesDetails', { id });
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowBackToTop(offsetY > 1000);
  };

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={[COLORS.primaryBright, COLORS.cyan]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.logoContainer}
      >
        <Text style={styles.headerTitle}>MangaTech</Text>
      </LinearGradient>
      <Text style={styles.headerSubtitle}>Latest Data-Streams Retrieved</Text>
      <View style={styles.headerUnderline} />
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return <View style={styles.footerPadding} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.cyan} />
        <Text style={styles.footerText}>RETRIEVING MORE DATA...</Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primaryBright} />
        <Text style={styles.loadingText}>SYNCING WITH NEURAL NET...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        ref={flatListRef}
        data={series}
        renderItem={({ item }) => (
          <MangaCard manga={item} onPress={handleMangaPress} />
        )}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        numColumns={2}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.cyan} 
            colors={[COLORS.cyan, COLORS.primaryBright]}
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error || 'No series found in the current stream.'}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                <Text style={styles.retryText}>REBOOT STREAM</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      <Animated.View style={[styles.fabContainer, { opacity: fadeAnim, transform: [{ scale: fadeAnim }] }]}>
        <TouchableOpacity 
          style={styles.fab} 
          onPress={scrollToTop}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryBright]}
            style={styles.fabGradient}
          >
            <ChevronUp size={28} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.primaryBright,
    fontFamily: FONTS.heading,
    fontSize: 12,
    letterSpacing: 2,
  },
  header: {
    paddingHorizontal: GLOBS.padding,
    paddingTop: 24,
    marginBottom: 20,
  },
  logoContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderRadius: 4,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: FONTS.headingBlack,
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  headerUnderline: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.cyan,
    marginTop: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: GLOBS.padding,
  },
  footerLoader: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.cyan,
    fontSize: 10,
    fontFamily: FONTS.heading,
    marginTop: 10,
    letterSpacing: 2,
  },
  footerPadding: {
    height: 40,
  },
  errorText: {
    color: COLORS.pink,
    fontFamily: FONTS.bodyMedium,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cyan,
  },
  retryText: {
    color: COLORS.cyan,
    fontFamily: FONTS.heading,
    fontSize: 14,
    letterSpacing: 1,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  fabGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

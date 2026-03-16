import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  FlatList, 
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search as SearchIcon } from 'lucide-react-native';
import { MangaApi } from '../services/api';
import { SeriesSearchResult } from '../types';
import { MangaCard } from '../components/MangaCard';
import { COLORS, FONTS, GLOBS } from '../constants/theme';

export const SearchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SeriesSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const data = await MangaApi.search(query);
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMangaPress = (id: string) => {
    navigation.navigate('SeriesDetails', { id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NET SEARCH</Text>
        <View style={styles.headerUnderline} />
      </View>

      <View style={styles.searchContainer}>
        <View style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused
        ]}>
          <SearchIcon 
            size={20} 
            color={isFocused ? COLORS.cyan : COLORS.textSecondary} 
            style={styles.searchIcon} 
          />
          <TextInput
            style={styles.input}
            placeholder="ACCESS DATABASE..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            returnKeyType="search"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryBright]}
            style={styles.searchGradient}
          >
            <Text style={styles.searchButtonText}>SCAN</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primaryBright} />
          <Text style={styles.loadingText}>SCANNING DATASTREAMS...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={({ item }) => (
            <MangaCard manga={item} onPress={handleMangaPress} />
          )}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            query ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>NO DATA NODES FOUND FOR "{query.toUpperCase()}"</Text>
              </View>
            ) : (
               <View style={styles.emptyState}>
                <Text style={styles.emptyText}>INITIATE SCAN TO RETRIEVE DATA</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: GLOBS.padding,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.headingBlack,
    color: '#FFF',
    letterSpacing: 2,
  },
  headerUnderline: {
    width: 50,
    height: 4,
    backgroundColor: COLORS.cyan,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputWrapperFocused: {
    borderColor: COLORS.cyan,
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: COLORS.text,
    fontFamily: FONTS.bodyMedium,
  },
  searchButton: {
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
  },
  searchGradient: {
    height: '100%',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFF',
    fontFamily: FONTS.heading,
    fontSize: 14,
    letterSpacing: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.cyan,
    fontFamily: FONTS.heading,
    fontSize: 12,
    letterSpacing: 2,
  },
  listContent: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    letterSpacing: 1,
    paddingHorizontal: 40,
  },
});

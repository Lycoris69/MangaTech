import React, { useState } from 'react';
import { 
  View, 
  FlatList,
  Text, 
  StyleSheet, 
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground, MangaCard } from '../components/ui';
import { colors, spacing, typography, borderRadius } from '../styles/theme';

export default function LibraryScreen({ navigation }) {
  const [filter, setFilter] = useState('all'); // all, reading, completed, bookmarked
  
  // Mock data
  const library = [
    { id: '1', title: 'Manga #1', status: 'reading' },
    { id: '2', title: 'Manga #2', status: 'completed' },
    { id: '3', title: 'Manga #3', status: 'reading' },
    { id: '4', title: 'Manga #4', status: 'bookmarked' },
    { id: '5', title: 'Manga #5', status: 'reading' },
    { id: '6', title: 'Manga #6', status: 'completed' },
  ];
  
  const filteredLibrary = filter === 'all' 
    ? library 
    : library.filter(m => m.status === filter);
  
  const handleMangaPress = (manga) => {
    navigation.navigate('Reader', { mangaId: manga.id });
  };
  
  const renderManga = ({ item }) => (
    <MangaCard
      title={item.title}
      onPress={() => handleMangaPress(item)}
    />
  );
  
  return (
    <GradientBackground variant="dark">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Library</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-vertical" size={24} color={colors.purple.neon} />
          </TouchableOpacity>
        </View>
        
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {['all', 'reading', 'completed', 'bookmarked'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterTab,
                filter === f && styles.filterTabActive
              ]}
            >
              <Text style={[
                styles.filterText,
                filter === f && styles.filterTextActive
              ]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Grid */}
        <FlatList
          data={filteredLibrary}
          renderItem={renderManga}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />
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
  
  headerTitle: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.black,
    color: colors.text.primary,
  },
  
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray,
    borderWidth: 1,
    borderColor: colors.purple.neon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  
  filterTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  
  filterTabActive: {
    backgroundColor: colors.purple.dark,
    borderColor: colors.purple.neon,
  },
  
  filterText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  
  filterTextActive: {
    color: colors.purple.neon,
    fontWeight: typography.weights.bold,
  },
  
  grid: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  
  row: {
    justifyContent: 'space-between',
  },
});

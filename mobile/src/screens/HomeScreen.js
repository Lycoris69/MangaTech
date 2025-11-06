import React, { useState } from 'react';
import { 
  View, 
  ScrollView, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  GradientBackground, 
  HolographicText, 
  MangaCard,
  GlowButton 
} from '../components/ui';
import { colors, spacing, typography, borderRadius } from '../styles/theme';

export default function HomeScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mock data
  const recents = [
    { id: '1', title: 'Recent #1' },
    { id: '2', title: 'Recent #2' },
  ];
  
  const newReleases = [
    { id: '3', title: 'New #1' },
    { id: '4', title: 'New #2' },
    { id: '5', title: 'New #3' },
    { id: '6', title: 'New #4' },
  ];
  
  const trending = [
    { id: '7', title: 'Trend #1' },
    { id: '8', title: 'Trend #2' },
  ];
  
  const handleMangaPress = (manga) => {
    navigation.navigate('Reader', { mangaId: manga.id });
  };
  
  return (
    <GradientBackground variant="dark">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <HolographicText fontSize={32} fontWeight="900">
            MangaTech
          </HolographicText>
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={24} color={colors.purple.neon} />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Navigation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.navigationGrid}>
              <TouchableOpacity 
                style={styles.navCard}
                onPress={() => navigation.navigate('Reader', { chapterId: 1 })}
              >
                <Ionicons name="book" size={32} color={colors.purple.neon} />
                <Text style={styles.navCardText}>Reader</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.navCard}
                onPress={() => navigation.navigate('Library')}
              >
                <Ionicons name="library" size={32} color={colors.cyan.neon} />
                <Text style={styles.navCardText}>Library</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.navCard}
                onPress={() => navigation.navigate('Settings')}
              >
                <Ionicons name="settings" size={32} color={colors.pink.main} />
                <Text style={styles.navCardText}>Settings</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.navCard}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Ionicons name="notifications" size={32} color={colors.purple.neon} />
                <Text style={styles.navCardText}>Notifications</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Recents Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recents</Text>
            <View style={styles.horizontalList}>
              {recents.map((manga) => (
                <MangaCard
                  key={manga.id}
                  title={manga.title}
                  onPress={() => handleMangaPress(manga)}
                  isRecent
                />
              ))}
            </View>
          </View>
          
          {/* New Releases Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New Releases</Text>
            <View style={styles.horizontalList}>
              {newReleases.map((manga) => (
                <MangaCard
                  key={manga.id}
                  title={manga.title}
                  onPress={() => handleMangaPress(manga)}
                />
              ))}
            </View>
          </View>
          
          {/* Trending Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trending</Text>
            <View style={styles.horizontalList}>
              {trending.map((manga) => (
                <MangaCard
                  key={manga.id}
                  title={manga.title}
                  onPress={() => handleMangaPress(manga)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
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
  
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray,
    borderWidth: 1,
    borderColor: colors.purple.neon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  
  section: {
    marginBottom: spacing.lg,
  },
  
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  horizontalList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  navigationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  
  navCard: {
    width: '47%',
    aspectRatio: 1,
    backgroundColor: colors.gray,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.purple.neon,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  navCardText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
});

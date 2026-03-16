import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Modal, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { ChapterInfo } from '../types';
import { COLORS, FONTS, GLOBS } from '../constants/theme';

const { height } = Dimensions.get('window');

interface ChapterSelectorProps {
  visible: boolean;
  onClose: () => void;
  chapters: ChapterInfo[];
  currentChapterId: string;
  onSelect: (chapter: ChapterInfo) => void;
}

export const ChapterSelector: React.FC<ChapterSelectorProps> = ({ 
  visible, 
  onClose, 
  chapters, 
  currentChapterId, 
  onSelect 
}) => {
  const renderItem = ({ item }: { item: ChapterInfo }) => {
    const isActive = item.id === currentChapterId;
    return (
      <TouchableOpacity 
        style={[
          styles.chapterItem,
          isActive && styles.activeChapterItem
        ]}
        onPress={() => {
          onSelect(item);
          onClose();
        }}
      >
        <Text style={[
          styles.chapterText,
          isActive && styles.activeChapterText
        ]}>
          CHAPTER {item.chapterNumber} {item.title ? `- ${item.title.toUpperCase()}` : ''}
        </Text>
        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.blurBackground} />
        <SafeAreaView style={styles.modalContent}>
          <LinearGradient
            colors={[COLORS.cardBg, COLORS.background]}
            style={styles.container}
          >
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>SELECT SCAN-LINE</Text>
                <View style={styles.headerUnderline} />
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[...chapters].reverse()}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </LinearGradient>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    maxHeight: height * 0.7,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.heading,
    color: '#FFF',
    letterSpacing: 1.5,
  },
  headerUnderline: {
    width: 30,
    height: 3,
    backgroundColor: COLORS.cyan,
    marginTop: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  chapterItem: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeChapterItem: {
    backgroundColor: 'rgba(157, 78, 221, 0.1)',
  },
  chapterText: {
    fontSize: 16,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  activeChapterText: {
    color: COLORS.cyan,
    fontFamily: FONTS.bodyBold,
    textShadowColor: COLORS.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.cyan,
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
});

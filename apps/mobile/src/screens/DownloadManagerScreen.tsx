import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronDown, 
  ChevronRight, 
  Pause, 
  Play, 
  X, 
  RefreshCcw, 
  ChevronLeft,
  Package,
  AlertTriangle
} from 'lucide-react-native';
import { MangaApi } from '../services/api';
import { DownloadTask } from '../types';
import { COLORS, FONTS, GLOBS } from '../constants/theme';

const { width } = Dimensions.get('window');

interface GroupedTasks {
  [seriesId: string]: {
    title: string;
    tasks: DownloadTask[];
  };
}

export const DownloadManagerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

  const fetchTasks = useCallback(async () => {
    try {
      const data = await MangaApi.getDownloads();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch download tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000); // Polling for progress
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const toggleSeries = (seriesId: string) => {
    setExpandedSeries(prev => {
      const next = new Set(prev);
      if (next.has(seriesId)) next.delete(seriesId);
      else next.add(seriesId);
      return next;
    });
  };

  const handlePause = async (taskId: string) => {
    try {
      await MangaApi.pauseDownload(taskId);
      fetchTasks();
    } catch (error) {
      Alert.alert('Error', 'Failed to pause download');
    }
  };

  const handleResume = async (taskId: string) => {
    try {
      await MangaApi.resumeDownload(taskId);
      fetchTasks();
    } catch (error) {
      Alert.alert('Error', 'Failed to resume download');
    }
  };

  const handleCancel = async (taskId: string) => {
    Alert.alert(
      'Cancel Download',
      'Are you sure you want to stop and remove this download?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: async () => {
            try {
              await MangaApi.cancelDownload(taskId);
              fetchTasks();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel download');
            }
          }
        }
      ]
    );
  };

  const handleRetry = async (taskId: string) => {
    try {
      await MangaApi.retryDownload(taskId);
      fetchTasks();
    } catch (error) {
      Alert.alert('Error', 'Failed to retry download');
    }
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    const seriesId = task.seriesId || 'unknown';
    if (!acc[seriesId]) {
      acc[seriesId] = {
        title: task.seriesTitle || seriesId,
        tasks: []
      };
    }
    acc[seriesId].tasks.push(task);
    return acc;
  }, {} as GroupedTasks);

  const renderTaskCard = (task: DownloadTask) => (
    <View key={task.id} style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle} numberOfLines={1}>
          {task.chapterTitle || 'Unknown Chapter'}
        </Text>
        <Text style={[styles.statusBadge, styles[`status${task.status.charAt(0).toUpperCase() + task.status.slice(1)}`]]}>
          {task.status.toUpperCase()}
        </Text>
      </View>

      {(task.status === 'downloading' || task.status === 'paused' || task.status === 'pending') && (
        <View style={styles.progressSection}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${task.progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{task.progress}%</Text>
        </View>
      )}

      <View style={styles.taskActions}>
        <View style={styles.timeInfo}>
          {task.status === 'downloading' && task.estimatedTimeRemaining > 0 && (
            <Text style={styles.etaText}>ETA: {Math.ceil(task.estimatedTimeRemaining / 60)}m remaining</Text>
          )}
        </View>
        <View style={styles.actionButtons}>
          {task.status === 'downloading' || task.status === 'pending' ? (
            <TouchableOpacity onPress={() => handlePause(task.id)} style={styles.actionButton}>
              <Pause size={18} color={COLORS.cyan} />
            </TouchableOpacity>
          ) : task.status === 'paused' ? (
            <TouchableOpacity onPress={() => handleResume(task.id)} style={styles.actionButton}>
              <Play size={18} color={COLORS.cyan} />
            </TouchableOpacity>
          ) : task.status === 'failed' ? (
            <TouchableOpacity onPress={() => handleRetry(task.id)} style={styles.actionButton}>
              <RefreshCcw size={18} color={COLORS.cyan} />
            </TouchableOpacity>
          ) : null}
          {(task.status !== 'completed') && (
            <TouchableOpacity onPress={() => handleCancel(task.id)} style={styles.actionButton}>
              <X size={18} color={COLORS.pink} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={28} color="#FFF" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>DOWNLOAD CENTER</Text>
          <View style={styles.headerUnderline} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.cyan}
          />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={COLORS.primaryBright} style={styles.loader} />
        ) : Object.keys(groupedTasks).length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={64} color={COLORS.border} />
            <Text style={styles.emptyText}>NO ACTIVE DATA TRANSFERS</Text>
          </View>
        ) : (
          Object.entries(groupedTasks).map(([seriesId, group]) => {
            const isExpanded = expandedSeries.has(seriesId);
            const completedCount = group.tasks.filter(t => t.status === 'completed').length;
            const totalProgress = (group.tasks.reduce((sum, t) => sum + t.progress, 0) / (group.tasks.length * 100)) * 100;

            return (
              <View key={seriesId} style={styles.seriesGroup}>
                <TouchableOpacity 
                  style={styles.seriesHeader} 
                  onPress={() => toggleSeries(seriesId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.seriesInfo}>
                    {isExpanded ? <ChevronDown size={20} color={COLORS.primaryBright} /> : <ChevronRight size={20} color={COLORS.primaryBright} />}
                    <Text style={styles.seriesTitleText} numberOfLines={1}>{group.title}</Text>
                  </View>
                  <View style={styles.seriesStats}>
                    <Text style={styles.seriesStatsText}>{completedCount}/{group.tasks.length}</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.overallProgressBarBg}>
                  <View style={[styles.overallProgressBarFill, { width: `${totalProgress}%` }]} />
                </View>

                {isExpanded && (
                  <View style={styles.tasksContainer}>
                    {group.tasks.map(renderTaskCard)}
                  </View>
                )}
              </View>
            );
          })
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: GLOBS.padding,
    paddingTop: 16,
  },
  backButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.headingBlack,
    color: '#FFF',
    letterSpacing: 2,
  },
  headerUnderline: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.cyan,
    marginTop: 4,
  },
  scrollContent: {
    padding: GLOBS.padding,
    paddingBottom: 40,
  },
  loader: {
    marginTop: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: COLORS.border,
    fontFamily: FONTS.heading,
    fontSize: 14,
    marginTop: 20,
    letterSpacing: 1.5,
  },
  seriesGroup: {
    backgroundColor: COLORS.cardBg,
    borderRadius: GLOBS.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  seriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  seriesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  seriesTitleText: {
    color: '#FFF',
    fontFamily: FONTS.heading,
    fontSize: 16,
    marginLeft: 12,
  },
  seriesStats: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  seriesStatsText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  overallProgressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  overallProgressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primaryBright,
  },
  tasksContainer: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  taskCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskTitle: {
    color: '#DDD',
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    flex: 1,
  },
  statusBadge: {
    fontSize: 9,
    fontFamily: FONTS.heading,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusPending: { backgroundColor: COLORS.border, color: '#000' },
  statusDownloading: { backgroundColor: COLORS.cyan, color: '#000' },
  statusCompleted: { backgroundColor: COLORS.green, color: '#000' },
  statusFailed: { backgroundColor: COLORS.pink, color: '#FFF' },
  statusPaused: { backgroundColor: COLORS.textSecondary, color: '#000' },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primaryBright,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    width: 35,
    textAlign: 'right',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flex: 1,
  },
  etaText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONTS.body,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

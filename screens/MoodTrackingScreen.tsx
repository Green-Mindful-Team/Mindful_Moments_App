import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, startOfDay } from 'date-fns';
import StorageService from '../services/StorageService';
import AIService from '../services/AIService';
import { useTheme } from '../constants/ThemeContext';

const screenWidth = Dimensions.get('window').width;

export default function MoodTrackingScreen() {
  const colors = useTheme();
  const [moodHistory, setMoodHistory] = useState<Array<{ date: string; mood: number }>>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [affirmation, setAffirmation] = useState<{ affirmation: string; tip: string } | null>(null);
  const [insights, setInsights] = useState<{ summary: string; insights: string[]; sentiment: string } | null>(null);
  const [isLoadingAffirmation, setIsLoadingAffirmation] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loadMoodHistory();
    loadDailyAffirmation();
  }, [selectedPeriod]);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadMoodHistory();
      loadDailyAffirmation();
      if (moodHistory.length > 0) {
        loadInsights();
      }
    });
    return unsubscribe;
  }, [navigation, selectedPeriod]);

  useEffect(() => {
    if (moodHistory.length >= 3) {
      loadInsights();
    }
  }, [moodHistory]);

  const loadMoodHistory = async () => {
    let startDate: Date;
    const endDate = new Date();

    switch (selectedPeriod) {
      case 'week':
        startDate = subDays(endDate, 7);
        break;
      case 'month':
        startDate = subDays(endDate, 30);
        break;
      default:
        startDate = new Date(0); // All time
    }

    const history = await StorageService.getMoodHistoryRange(startDate, endDate);
    setMoodHistory(history);
  };

  const loadDailyAffirmation = async () => {
    // Check if we already have today's affirmation
    const today = new Date().toISOString().split('T')[0];
    const saved = await StorageService.getDailyPrompt();
    
    if (saved && saved.date === today) {
      // Use cached affirmation if available
      return;
    }

    setIsLoadingAffirmation(true);
    try {
      const result = await AIService.generateAffirmation();
      setAffirmation(result);
    } catch (error) {
      console.error('Error loading affirmation:', error);
    }
    setIsLoadingAffirmation(false);
  };

  const loadInsights = async () => {
    if (moodHistory.length < 3) return; // Need at least 3 entries for insights

    setIsLoadingInsights(true);
    try {
      // Get recent journal entries for analysis
      const allEntries = await StorageService.getAllEntries();
      const recentEntries = allEntries.slice(0, 10).map(e => e.content);
      
      if (recentEntries.length > 0) {
        const result = await AIService.generateSummary(recentEntries);
        setInsights(result);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    }
    setIsLoadingInsights(false);
  };

  const getChartData = () => {
    if (moodHistory.length === 0) {
      return {
        labels: ['No data'],
        datasets: [{ data: [0] }],
      };
    }

    const labels = moodHistory.map((item) => {
      const date = new Date(item.date);
      return format(date, 'MMM dd');
    });

    const data = moodHistory.map((item) => item.mood);

    return {
      labels: labels.length > 7 ? labels.filter((_, i) => i % Math.ceil(labels.length / 7) === 0) : labels,
      datasets: [{ data }],
    };
  };

  const getAverageMood = (): number => {
    if (moodHistory.length === 0) return 0;
    const sum = moodHistory.reduce((acc, item) => acc + item.mood, 0);
    return sum / moodHistory.length;
  };

  const getMoodTrend = (): 'up' | 'down' | 'stable' => {
    if (moodHistory.length < 2) return 'stable';
    
    const recent = moodHistory.slice(-7);
    const older = moodHistory.slice(0, -7);
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((acc, item) => acc + item.mood, 0) / recent.length;
    const olderAvg = older.reduce((acc, item) => acc + item.mood, 0) / older.length;
    
    if (recentAvg > olderAvg + 0.3) return 'up';
    if (recentAvg < olderAvg - 0.3) return 'down';
    return 'stable';
  };

  const chartData = getChartData();
  const averageMood = getAverageMood();
  const trend = getMoodTrend();

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(17, 24, 39, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#6366f1',
    },
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text}]}>Mood Tracking</Text>
        <View style={styles.periodSelector}>
          {(['week', 'month', 'all'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, { backgroundColor: colors.card, borderColor: colors.textMuted },
                selectedPeriod === period && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(period)}
              >
              <Text
                style={[styles.periodButtonText, { color: colors.textMuted },
                  selectedPeriod === period && styles.periodButtonTextActive,]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {moodHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="stats-chart-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.text}]}>No mood data yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted}]}>
            Start journaling and track your mood to see insights here
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.card}]}>
             <Text style={[styles.statLabel, {color: colors.textMuted}]}>Average Mood</Text>
              <View style={styles.statValueContainer}>
                <Ionicons
                  name={averageMood >= 3.5 ? 'happy' : averageMood >= 2.5 ? 'happy-outline' : 'sad-outline'}
                  size={32}
                  color={averageMood >= 3.5 ? '#10b981' : averageMood >= 2.5 ? '#f59e0b' : '#ef4444'}
                />
                <Text style={[styles.statValue, {color: colors.text}]}>{averageMood.toFixed(1)}</Text>
              </View>
            </View>

            <View style={[styles.statCard, {backgroundColor: colors.card}]}>
              <Text style={[styles.statLabel, { color: colors.textMuted}]}>Trend</Text>
              <View style={styles.statValueContainer}>
                <Ionicons
                  name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
                  size={32}
                  color={trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#9ca3af'}
                />
                <Text style={[styles.statValue, {color: colors.text}]}>
                  {trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}
                </Text>
              </View>
            </View>
          </View>

          {affirmation && (
            <View style={[styles.affirmationCard, {backgroundColor: colors.sleepBox}]}>
              <View style={styles.affirmationHeader}>
                <Ionicons name="heart" size={20} color="#ec4899" />
                <Text style={styles.affirmationTitle}>Daily Affirmation</Text>
              </View>
              <Text style={[styles.affirmationText, {color: colors.text}]}>{affirmation.affirmation}</Text>
              <View style={[styles.tipContainer, {backgroundColor: colors.card}]}>
                <Ionicons name="leaf" size={16} color="#10b981" />
                <Text style={[styles.tipText, { color: colors.text}]}>{affirmation.tip}</Text>
              </View>
            </View>
          )}

          {insights && insights.insights.length > 0 && (
            <View style={[styles.insightsCard, {backgroundColor: colors.affirmationBox}]}>
              <View style={styles.insightsHeader}>
                <Ionicons name="bulb" size={20} color="#f59e0b" />
                <Text style={styles.insightsTitle}>AI Insights</Text>
              </View>
              {insights.summary && (
                <Text style={[styles.insightsSummary, {color: colors.text}]}>{insights.summary}</Text>
              )}
              <View style={styles.insightsList}>
                {insights.insights.map((insight, index) => (
                  <View key={index} style={styles.insightItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#648767" />
                    <Text style={[styles.insightText, { color: colors.text}]}>{insight}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.chartContainer, {backgroundColor: colors.card}]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Mood Over Time</Text>
            <LineChart
              data={chartData}
              width={screenWidth - 32}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              withDots={true}
              withShadow={false}
            />
          </View>

          <View style={[styles.legend, {backgroundColor: colors.card}]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
              <Text style={[styles.legendText, {color: colors.textMuted }]}>1-2 (Not Great)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#f59e0b' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted}]}>3 (Okay)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>4-5 (Great)</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginTop:54,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#6d9f71',
    borderColor: '#7dc95e',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  chartContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 12,
    padding: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 12,
  },
  affirmationCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ec4899',
  },
  affirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  affirmationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ec4899',
  },
  affirmationText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  insightsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
  },
  insightsSummary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  insightsList: {
    gap: 8,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

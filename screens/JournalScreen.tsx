import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import StorageService, { JournalEntry } from '../services/StorageService';

type RootStackParamList = {
  JournalList: undefined;
  NewEntry: undefined;
  EntryDetail: { entryId: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function JournalScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEntries();
    
    // Refresh when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadEntries();
    });

    return unsubscribe;
  }, [navigation]);

  const loadEntries = async () => {
    const loadedEntries = await StorageService.getAllEntries();
    setEntries(loadedEntries);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  };

  const renderEntry = ({ item }: { item: JournalEntry }) => {
    const entryDate = new Date(item.date);
    const preview = item.content.length > 100 
      ? item.content.substring(0, 100) + '...' 
      : item.content;

    return (
      <TouchableOpacity
        style={styles.entryCard}
        onPress={() => navigation.navigate('EntryDetail', { entryId: item.id })}
      >
        <View style={styles.entryHeader}>
          <Text style={styles.entryDate}>
            {format(entryDate, 'MMM dd, yyyy')}
          </Text>
          {item.mood !== undefined && (
            <View style={styles.moodBadge}>
              <Ionicons 
                name={getMoodIcon(item.mood)} 
                size={16} 
                color={getMoodColor(item.mood)} 
              />
            </View>
          )}
        </View>
        {item.prompt && (
          <Text style={styles.promptText} numberOfLines={1}>
            {item.prompt}
          </Text>
        )}
        <Text style={styles.entryPreview} numberOfLines={3}>
          {preview}
        </Text>
        <View style={styles.entryFooter}>
          {item.voiceUri && (
            <Ionicons name="mic" size={14} color="#6366f1" />
          )}
          <Text style={styles.timeText}>
            {format(entryDate, 'h:mm a')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const getMoodIcon = (mood: number): any => {
    if (mood >= 4) return 'happy';
    if (mood >= 3) return 'happy-outline';
    if (mood >= 2) return 'sad-outline';
    return 'sad';
  };

  const getMoodColor = (mood: number): string => {
    if (mood >= 4) return '#10b981';
    if (mood >= 3) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <View style={styles.container}>
      {entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyText}>No entries yet</Text>
          <Text style={styles.emptySubtext}>
            Start your journaling journey today
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
      
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewEntry')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listContent: {
    padding: 16,
  },
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  moodBadge: {
    padding: 4,
  },
  promptText: {
    fontSize: 12,
    color: '#6366f1',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  entryPreview: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  entryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

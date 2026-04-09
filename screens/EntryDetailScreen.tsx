import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import StorageService, { JournalEntry } from '../services/StorageService';
import VoiceService from '../services/VoiceService';

export default function EntryDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const entryId = (route.params as any)?.entryId;

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadEntry();
  }, [entryId]);

  // Reload when screen comes into focus (e.g. after editing)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (entryId) loadEntry();
    });
    return unsubscribe;
  }, [navigation, entryId]);

  const loadEntry = async () => {
    if (!entryId) return;
    
    setIsLoading(true);
    const loadedEntry = await StorageService.getEntry(entryId);
    setEntry(loadedEntry);
    setIsLoading(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (entryId) {
              const deleted = await StorageService.deleteEntry(entryId);
              if (deleted) {
                navigation.goBack();
              } else {
                Alert.alert('Error', 'Failed to delete entry.');
              }
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate('NewEntry' as never, { entryId } as never);
  };

  const handlePlayVoice = async () => {
    if (!entry?.voiceUri) return;
    
    setIsPlaying(true);
    await VoiceService.playRecording(entry.voiceUri);
    // Note: In a real app, you'd want to track playback status
    setTimeout(() => setIsPlaying(false), 3000);
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

  const getMoodLabel = (mood: number): string => {
    if (mood >= 4) return 'Great';
    if (mood >= 3) return 'Good';
    if (mood >= 2) return 'Okay';
    return 'Not Great';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Entry not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const createdDate = new Date(entry.createdAt || entry.date);
  const editedDate = entry.updatedAt ? new Date(entry.updatedAt) : null;
  const isEdited = !!editedDate && editedDate.getTime() > createdDate.getTime();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.date}>{format(createdDate, 'EEEE, MMMM dd, yyyy')}</Text>
          <Text style={styles.time}>{format(createdDate, 'h:mm a')}</Text>
          <Text style={styles.metaText}>
            Created: {format(createdDate, 'MMM dd, yyyy h:mm a')}
          </Text>
          {isEdited && editedDate && (
            <Text style={styles.metaText}>
              Last edited: {format(editedDate, 'MMM dd, yyyy h:mm a')}
            </Text>
          )}
        </View>

        {entry.prompt && (
          <View style={styles.promptContainer}>
            <Ionicons name="bulb" size={16} color="#6366f1" />
            <Text style={styles.promptText}>{entry.prompt}</Text>
          </View>
        )}

        {entry.mood !== undefined && (
          <View style={styles.moodContainer}>
            <View style={styles.moodInfo}>
              <Ionicons
                name={getMoodIcon(entry.mood)}
                size={24}
                color={getMoodColor(entry.mood)}
              />
              <Text style={styles.moodLabel}>{getMoodLabel(entry.mood)}</Text>
            </View>
          </View>
        )}

        <View style={styles.contentContainer}>
          <Text style={styles.content}>{entry.content}</Text>
        </View>

        {entry.voiceUri && (
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={handlePlayVoice}
            disabled={isPlaying}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color="#6366f1"
            />
            <Text style={styles.voiceButtonText}>
              {isPlaying ? 'Playing...' : 'Play Voice Recording'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Ionicons name="create-outline" size={20} color="#6366f1" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    //backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#648767',
    //backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  date: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  time: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  promptContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  promptText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    fontStyle: 'italic',
  },
  moodContainer: {
    marginBottom: 16,
  },
  moodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  contentContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  content: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  voiceButtonText: {
    fontSize: 14,
    color:'#648767',
    //color: '#6366f1',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#648767',
    //color: '#6366f1',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});

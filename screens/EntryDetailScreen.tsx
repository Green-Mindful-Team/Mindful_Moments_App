import React, { useState, useEffect, useRef } from 'react';
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
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfDay } from 'date-fns';
import { useTheme } from '../constants/ThemeContext';
import MoodGlyph from '../components/MoodGlyph';
import { getMoodColor, getMoodLabel } from '../constants/moodScale';
import StorageService, {
  JournalEntry,
  getJournalEntryVoiceUris,
  normalizeJournalEntry,
} from '../services/StorageService';
import VoiceService, { VoicePlaybackUI } from '../services/VoiceService';

type JournalStackParamList = {
  Home: undefined;
  JournalList: undefined;
  NewEntry: { entryId?: string; initialPrompt?: string } | undefined;
  EntryDetail: { entryId: string; fromDuplicateSave?: boolean };
};

export default function EntryDetailScreen() {
  const navigation = useNavigation<StackNavigationProp<JournalStackParamList>>();
  const route = useRoute();
  const colors = useTheme();
  const entryId = (route.params as any)?.entryId;
  const duplicateAlertScheduled = useRef(false);

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [voicePlayback, setVoicePlayback] = useState<VoicePlaybackUI>({
    activeUri: null,
    status: 'idle',
  });

  useEffect(() => {
    return VoiceService.subscribePlayback(setVoicePlayback);
  }, []);

  useEffect(() => {
    loadEntry();
  }, [entryId]);

  useEffect(() => {
    const fromDup = (route.params as { fromDuplicateSave?: boolean })?.fromDuplicateSave;
    if (!entryId || !fromDup) {
      duplicateAlertScheduled.current = false;
      return;
    }
    if (duplicateAlertScheduled.current) return;
    duplicateAlertScheduled.current = true;

    Alert.alert(
      'Duplicate entry',
      'You cannot add a duplicate entry with the same prompt and date. Here is your existing saved entry.',
      [
        {
          text: 'OK',
          onPress: () => {
            navigation.setParams({ entryId, fromDuplicateSave: undefined } as never);
            duplicateAlertScheduled.current = false;
          },
        },
      ],
      { cancelable: false }
    );
  }, [entryId, navigation, (route.params as { fromDuplicateSave?: boolean })?.fromDuplicateSave]);

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
    if (entryId) {
      navigation.navigate('NewEntry', { entryId });
    }
  };

  const handleRemoveVoiceAt = (index: number) => {
    if (!entry || !entryId) return;
    const uris = getJournalEntryVoiceUris(entry);
    const uri = uris[index];
    if (!uri) return;
    Alert.alert(
      'Remove voice note?',
      `Recording ${index + 1} will be removed from this entry. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await VoiceService.deleteVoiceFile(uri);
            const now = new Date().toISOString();
            const remaining = uris.filter((_, i) => i !== index);
            const updated = normalizeJournalEntry({
              ...entry,
              voiceUri: undefined,
              voiceUris: remaining,
              updatedAt: now,
            });
            const ok = await StorageService.saveEntry(updated);
            if (ok) {
              setEntry(updated);
            } else {
              Alert.alert('Error', 'Could not update entry.');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.journalButton} />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={[styles.errorText, { color: colors.text }]}>Entry not found</Text>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.journalButton }]} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const journalDay = startOfDay(new Date(entry.date));
  const savedAt = new Date(entry.createdAt || entry.date);
  const editedDate = entry.updatedAt ? new Date(entry.updatedAt) : null;
  const isEdited = !!editedDate && editedDate.getTime() > savedAt.getTime();
  const voiceUris = getJournalEntryVoiceUris(entry);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.date, { color: colors.text }]}>
            {format(journalDay, 'EEEE, MMMM dd, yyyy')}
          </Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>
            Saved {format(savedAt, 'MMM d, yyyy')} at {format(savedAt, 'h:mm a')}
          </Text>
          {isEdited && editedDate && (
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              Last edited: {format(editedDate, 'MMM dd, yyyy h:mm a')}
            </Text>
          )}
        </View>

        {entry.prompt && (
          <View style={[styles.promptContainer, { backgroundColor: colors.sleepBox }]}>
            <Ionicons name="bulb" size={16} color={colors.journalButton} />
            <Text style={[styles.promptText, { color: colors.text }]}>{entry.prompt}</Text>
          </View>
        )}

        {entry.mood !== undefined && (
          <View style={styles.moodContainer}>
            <View style={[styles.moodInfo, { backgroundColor: colors.card }]}>
              <MoodGlyph mood={entry.mood} size={24} color={getMoodColor(entry.mood)} />
              <Text style={[styles.moodLabel, { color: colors.text }]}>{getMoodLabel(entry.mood)}</Text>
            </View>
          </View>
        )}

        <View style={[styles.contentContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.content, { color: colors.text }]}>{entry.content}</Text>
        </View>

        {voiceUris.length > 0 && (
          <View style={styles.voiceSection}>
            <Text style={[styles.voiceSectionTitle, { color: colors.text }]}>
              Voice recordings ({voiceUris.length}) — oldest first
            </Text>
            {voiceUris.map((uri, index) => (
              <View
                key={`${uri}-${index}`}
                style={[styles.voiceRow, { backgroundColor: colors.card }]}
              >
                <Text style={[styles.voiceIndexLabel, { color: colors.textMuted }]}>
                  {index + 1}.
                </Text>
                <TouchableOpacity
                  style={styles.voicePlayArea}
                  onPress={() => void VoiceService.playOrToggle(uri)}
                >
                  <Ionicons
                    name={
                      voicePlayback.activeUri === uri && voicePlayback.status === 'playing'
                        ? 'pause'
                        : 'play'
                    }
                    size={22}
                    color={colors.journalButton}
                  />
                  <Text style={[styles.voiceButtonText, { color: colors.journalButton }]}>
                    {voicePlayback.activeUri === uri && voicePlayback.status === 'playing'
                      ? 'Pause'
                      : voicePlayback.activeUri === uri && voicePlayback.status === 'paused'
                        ? 'Resume'
                        : 'Play'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.voiceDeleteBtn}
                  onPress={() => handleRemoveVoiceAt(index)}
                  accessibilityLabel={`Remove voice recording ${index + 1}`}
                >
                  <Ionicons name="trash-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.textMuted }]}>
        <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.sleepBox }]} onPress={handleEdit}>
          <Ionicons name="create-outline" size={20} color={colors.journalButton} />
          <Text style={[styles.editButtonText, { color: colors.journalButton }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.sleepBox }]} onPress={handleDelete}>
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
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
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
  },
  time: {
    fontSize: 14,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    marginTop: 4,
  },
  promptContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  promptText: {
    flex: 1,
    fontSize: 14,
    fontStyle: 'italic',
  },
  moodContainer: {
    marginBottom: 16,
  },
  moodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  contentContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
  },
  voiceSection: {
    marginBottom: 16,
  },
  voiceSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  voiceIndexLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 22,
  },
  voicePlayArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceDeleteBtn: {
    padding: 4,
  },
  voiceButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});

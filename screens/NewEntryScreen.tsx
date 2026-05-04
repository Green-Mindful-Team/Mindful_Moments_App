import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  useColorScheme,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../constants/ThemeContext';
import AIService from '../services/AIService';
import VoiceService, { VoicePlaybackUI } from '../services/VoiceService';
import StorageService, { JournalEntry, getJournalEntryVoiceUris } from '../services/StorageService';
import * as Crypto from 'expo-crypto';
import MoodGlyph from '../components/MoodGlyph';
import { coerceStoredMoodToThree } from '../constants/moodScale';
import { startOfDay, addDays, format, isSameDay } from 'date-fns';

/** Store journal day at local noon to avoid timezone shifting the calendar date. */
function calendarDayToStoredISO(day: Date): string {
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12, 0, 0, 0);
  return d.toISOString();
}

type JournalStackParamList = {
  Home: undefined;
  JournalList: undefined;
  NewEntry: { entryId?: string; initialPrompt?: string } | undefined;
  EntryDetail: { entryId: string; fromDuplicateSave?: boolean };
};

export default function NewEntryScreen() {
  const navigation = useNavigation<StackNavigationProp<JournalStackParamList>>();
  const route = useRoute();
  const colors = useTheme();
  const colorScheme = useColorScheme();
  const routeEntryId = (route.params as any)?.entryId;
  const initialPrompt = (route.params as any)?.initialPrompt;

  const [entryId, setEntryId] = useState<string | undefined>(routeEntryId);
  const [content, setContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [mood, setMood] = useState<number | undefined>(undefined);
  const [voiceUris, setVoiceUris] = useState<string[]>([]);
  const [originalDate, setOriginalDate] = useState<string | undefined>(undefined);
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string | undefined>(undefined);
  /** Calendar day this journal entry is for (defaults to today for new entries). */
  const [entryJournalDay, setEntryJournalDay] = useState(() => startOfDay(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [voicePlayback, setVoicePlayback] = useState<VoicePlaybackUI>({
    activeUri: null,
    status: 'idle',
  });

  useEffect(() => {
    return VoiceService.subscribePlayback(setVoicePlayback);
  }, []);

  useEffect(() => {
    // Initialize entryId from route params if provided
    if (routeEntryId && !entryId) {
      setEntryId(routeEntryId);
    }
  }, [routeEntryId]);

  useEffect(() => {
    if (entryId) {
      loadEntry();
    } else {
      if (initialPrompt) {
        setPrompt(initialPrompt);
      } else {
        generatePrompt();
      }
    }
  }, [entryId, initialPrompt]);

  const loadEntry = async () => {
    if (!entryId) return;
    
    setIsLoading(true);
    const entry = await StorageService.getEntry(entryId);
    if (entry) {
      setContent(entry.content);
      setPrompt(entry.prompt || '');
      setMood(entry.mood !== undefined ? coerceStoredMoodToThree(entry.mood) : undefined);
      setVoiceUris(getJournalEntryVoiceUris(entry));
      setOriginalDate(entry.date);
      setOriginalCreatedAt(entry.createdAt);
      setEntryJournalDay(startOfDay(new Date(entry.date)));
    }
    setIsLoading(false);
  };

  const generatePrompt = async (forceRefresh: boolean = false) => {
    setIsGeneratingPrompt(true);
    try {
      // Use cached daily prompt unless user explicitly refreshes.
      if (!forceRefresh) {
        const savedDailyPrompt = await StorageService.getDailyPrompt();
        if (savedDailyPrompt) {
          setPrompt(savedDailyPrompt.prompt);
          setIsGeneratingPrompt(false);
          return;
        }
      }

      // Generate new prompt if none exists for today
      const response = await AIService.generateDailyPrompt();
      setPrompt(response.prompt);
      
      // Save the prompt for today
      const today = new Date().toISOString();
      await StorageService.saveDailyPrompt(response.prompt, today);
    } catch (error) {
      console.error('Error generating prompt:', error);
    }
    setIsGeneratingPrompt(false);
  };

  const startRecording = async () => {
    const started = await VoiceService.startRecording();
    if (started) {
      setIsRecording(true);
    } else {
      Alert.alert('Permission Required', 'Please allow microphone access to record voice entries.');
    }
  };

  const stopRecording = async () => {
    const recording = await VoiceService.stopRecording();
    if (recording) {
      setVoiceUris((prev) => [...prev, recording.uri]);
      setIsRecording(false);
    }
  };

  const removeVoiceAt = (index: number) => {
    const uri = voiceUris[index];
    if (!uri) return;
    Alert.alert(
      'Remove recording?',
      `Delete recording ${index + 1} from this entry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await VoiceService.deleteVoiceFile(uri);
            setVoiceUris((prev) => prev.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    // Allow saving if there's text, voice recording, or mood selected
    if (!content.trim() && voiceUris.length === 0 && mood === undefined) {
      Alert.alert('Empty Entry', 'Please write something, record a voice note, or select a mood before saving.');
      return;
    }
    
    // If no text but there's a voice recording, use a placeholder
    const entryContent = content.trim() || (voiceUris.length > 0 ? '[Voice recording]' : '');

    try {
      const normalizedPrompt = (prompt || '').trim().toLowerCase();
      if (normalizedPrompt) {
        const allEntries = await StorageService.getAllEntries();
        const dayStart = startOfDay(entryJournalDay);
        const dayEnd = addDays(dayStart, 1);

        const duplicatePromptEntry = allEntries.find((existingEntry) => {
          if (entryId && existingEntry.id === entryId) return false;
          const existingDate = new Date(existingEntry.date);
          const isSameDay = existingDate >= dayStart && existingDate < dayEnd;
          const samePrompt = (existingEntry.prompt || '').trim().toLowerCase() === normalizedPrompt;
          return isSameDay && samePrompt;
        });

        if (duplicatePromptEntry) {
          navigation.replace('EntryDetail', {
            entryId: duplicatePromptEntry.id,
            fromDuplicateSave: true,
          });
          return;
        }
      }

      setIsLoading(true);
      const now = new Date().toISOString();
      const entryDate = calendarDayToStoredISO(entryJournalDay);
      const entryCreatedAt = entryId ? (originalCreatedAt || originalDate || now) : now;

      const entry: JournalEntry = {
        id: entryId || await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${Date.now()}-${Math.random()}`
        ),
        content: entryContent,
        mood: mood !== undefined ? coerceStoredMoodToThree(mood) : undefined,
        date: entryDate,
        prompt: prompt || undefined,
        ...(voiceUris.length > 0 ? { voiceUris: [...voiceUris] } : {}),
        createdAt: entryCreatedAt,
        updatedAt: entryId ? now : undefined,
      };

      const saved = await StorageService.saveEntry(entry);
      // Mood history for the graph is derived from all journal entries per day (averaged in StorageService).

      if (saved) {
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to save entry. Please try again.');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'An error occurred while saving.');
    } finally {
      setIsLoading(false);
    }
  };

  const onDatePickerChange = (_event: unknown, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selected) {
      setEntryJournalDay(startOfDay(selected));
    }
  };

  const MoodSelector = () => (
    <View style={styles.moodContainer}>
      <Text style={[styles.moodLabel, { color: colors.text }]}>How are you feeling?</Text>
      <View style={styles.moodButtons}>
        {([1, 2, 3] as const).map((value) => {
          const selected = mood === value;
          return (
            <TouchableOpacity
              key={value}
              style={[
                styles.moodButton,
                { backgroundColor: colors.card, borderColor: colors.textMuted },
                selected && { borderColor: '#648767', backgroundColor: colors.sleepBox },
              ]}
              onPress={() => setMood(value)}
            >
              <MoodGlyph
                mood={value}
                size={32}
                color={selected ? '#648767' : colors.textMuted}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  if (isLoading && entryId) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#648767" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.dateRow, { backgroundColor: colors.card }]}>
          <View style={styles.dateRowText}>
            <Text style={[styles.dateRowLabel, { color: colors.textMuted }]}>Entry date</Text>
            <Text style={[styles.dateRowValue, { color: colors.text }]}>
              {format(entryJournalDay, 'EEEE, MMM d, yyyy')}
            </Text>
            <Text style={[styles.dateRowHint, { color: colors.textMuted }]}>
              Defaults to today — tap to choose a past day if you are catching up.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.dateChangeBtn, { backgroundColor: colors.sleepBox }]}
            onPress={() => setShowDatePicker(true)}
            accessibilityLabel="Change entry date"
          >
            <Ionicons name="calendar-outline" size={22} color={colors.journalButton} />
          </TouchableOpacity>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={entryJournalDay}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
            onChange={onDatePickerChange}
            maximumDate={new Date()}
          />
        )}
        {Platform.OS === 'ios' && showDatePicker && (
          <TouchableOpacity
            style={styles.datePickerDone}
            onPress={() => setShowDatePicker(false)}
          >
            <Text style={[styles.datePickerDoneText, { color: colors.journalButton }]}>Done</Text>
          </TouchableOpacity>
        )}

        {prompt && (
          <View style={[styles.promptContainer, { backgroundColor: colors.sleepBox }]}>
            <View style={styles.promptHeader}>
              <Ionicons name="bulb" size={20} color="#648767" />
              <Text style={[styles.promptLabel, { color: '#648767' }]}>
                {isSameDay(entryJournalDay, new Date()) ? "Today's prompt" : 'Writing prompt'}
              </Text>
              {!entryId && (
                <TouchableOpacity onPress={() => generatePrompt(true)} disabled={isGeneratingPrompt}>
                  <Ionicons name="refresh" size={20} color="#648767" />
                </TouchableOpacity>
              )}
            </View>
            {isGeneratingPrompt ? (
              <ActivityIndicator size="small" color="#648767" style={styles.promptLoader} />
            ) : (
              <Text style={[styles.promptText, { color: colors.text }]}>{prompt}</Text>
            )}
          </View>
        )}

        <MoodSelector />

        <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder="Write your thoughts here..."
            placeholderTextColor={colors.textMuted}
            multiline
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
          />
        </View>

        {voiceUris.length > 0 && (
          <View style={styles.voiceList}>
            <Text style={[styles.voiceListTitle, { color: colors.text }]}>
              Voice recordings ({voiceUris.length}) — oldest first
            </Text>
            {voiceUris.map((uri, index) => (
              <View
                key={`${uri}-${index}`}
                style={[styles.voiceContainer, { backgroundColor: colors.card }]}
              >
                <Ionicons name="mic" size={16} color={colors.journalButton} />
                <Text style={[styles.voiceText, { color: colors.text }]} numberOfLines={1}>
                  Recording {index + 1}
                </Text>
                <View style={styles.voiceActions}>
                  <TouchableOpacity
                    onPress={() => VoiceService.playOrToggle(uri)}
                    accessibilityLabel={
                      voicePlayback.activeUri === uri && voicePlayback.status === 'playing'
                        ? 'Pause'
                        : 'Play or resume'
                    }
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
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeVoiceAt(index)}
                    accessibilityLabel={`Remove recording ${index + 1}`}
                  >
                    <Ionicons name="trash-outline" size={22} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.textMuted }]}>
        <TouchableOpacity
          style={[styles.voiceButton, { backgroundColor: colors.background }]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={24}
            color={isRecording ? '#ef4444' : '#648767'}
          />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#648767' }]} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Entry</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  dateRowText: {
    flex: 1,
  },
  dateRowLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dateRowValue: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateRowHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  dateChangeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerDone: {
    alignItems: 'flex-end',
    marginBottom: 12,
    marginTop: -8,
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
  },
  promptContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  promptLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  promptLoader: {
    marginTop: 8,
  },
  promptText: {
    fontSize: 15,
    lineHeight: 22,
  },
  moodContainer: {
    marginBottom: 16,
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  moodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  moodButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  moodButtonSelected: {
    borderColor:'#648767',
    //borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    minHeight: 200,
  },
  textInput: {
    fontSize: 16,
    color: '#111827',
    padding: 16,
    minHeight: 200,
  },
  voiceList: {
    marginBottom: 8,
  },
  voiceListTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  voiceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  voiceText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  voiceButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor:'#648767',
    //backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

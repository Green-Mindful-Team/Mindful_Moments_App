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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AIService from '../services/AIService';
import VoiceService from '../services/VoiceService';
import StorageService, { JournalEntry } from '../services/StorageService';
import * as Crypto from 'expo-crypto';

export default function NewEntryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const routeEntryId = (route.params as any)?.entryId;
  const initialPrompt = (route.params as any)?.initialPrompt;

  const [entryId, setEntryId] = useState<string | undefined>(routeEntryId);
  const [content, setContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [mood, setMood] = useState<number | undefined>(undefined);
  const [voiceUri, setVoiceUri] = useState<string | undefined>(undefined);
  const [originalDate, setOriginalDate] = useState<string | undefined>(undefined);
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

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
      setMood(entry.mood);
      setVoiceUri(entry.voiceUri);
      setOriginalDate(entry.date);
      setOriginalCreatedAt(entry.createdAt);
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
      setVoiceUri(recording.uri);
      setIsRecording(false);
    }
  };

  const handleSave = async () => {
    // Allow saving if there's text, voice recording, or mood selected
    if (!content.trim() && !voiceUri && mood === undefined) {
      Alert.alert('Empty Entry', 'Please write something, record a voice note, or select a mood before saving.');
      return;
    }
    
    // If no text but there's a voice recording, use a placeholder
    const entryContent = content.trim() || (voiceUri ? '[Voice recording]' : '');

    try {
      const normalizedPrompt = (prompt || '').trim().toLowerCase();
      if (normalizedPrompt) {
        const allEntries = await StorageService.getAllEntries();
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);

        const duplicatePromptEntry = allEntries.find(existingEntry => {
          if (entryId && existingEntry.id === entryId) return false;
          const existingDate = new Date(existingEntry.date);
          const isSameDay = existingDate >= todayStart && existingDate < todayEnd;
          const samePrompt = (existingEntry.prompt || '').trim().toLowerCase() === normalizedPrompt;
          return isSameDay && samePrompt;
        });

        if (duplicatePromptEntry) {
          Alert.alert(
            'Prompt Already Used Today',
            'You already created an entry for this prompt today. Please use a different prompt.'
          );
          return;
        }
      }

      setIsLoading(true);
      const now = new Date().toISOString();
      const entryDate = entryId ? (originalDate || now) : now;
      const entryCreatedAt = entryId ? (originalCreatedAt || originalDate || now) : now;

      const entry: JournalEntry = {
        id: entryId || await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${Date.now()}-${Math.random()}`
        ),
        content: entryContent,
        mood,
        date: entryDate,
        prompt: prompt || undefined,
        voiceUri,
        createdAt: entryCreatedAt,
        updatedAt: entryId ? now : undefined,
      };

      const saved = await StorageService.saveEntry(entry);
      
      // Also save mood to mood history if mood is selected
      // Use only the date (YYYY-MM-DD) so multiple entries on same day use same mood entry
      if (saved && mood !== undefined) {
        const entryDateOnly = new Date(entry.date).toISOString().split('T')[0]; // Get YYYY-MM-DD
        await StorageService.saveMood(entryDateOnly, mood);
      }
      
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

  const MoodSelector = () => (
    <View style={styles.moodContainer}>
      <Text style={styles.moodLabel}>How are you feeling?</Text>
      <View style={styles.moodButtons}>
        {[1, 2, 3, 4, 5].map((value) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.moodButton,
              mood === value && styles.moodButtonSelected,
            ]}
            onPress={() => setMood(value)}
          >
            <Ionicons
              name={getMoodIcon(value)}
              size={32}
              color={mood === value ? '#648767' : '#9ca3af'}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const getMoodIcon = (value: number): any => {
    if (value >= 4) return 'happy';
    if (value >= 3) return 'happy-outline';
    if (value >= 2) return 'sad-outline';
    return 'sad';
  };

  if (isLoading && entryId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#648767" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {prompt && (
          <View style={styles.promptContainer}>
            <View style={styles.promptHeader}>
              <Ionicons name="bulb" size={20} color="#648767" />
              <Text style={styles.promptLabel}>Today's Prompt</Text>
              {!entryId && (
                <TouchableOpacity onPress={() => generatePrompt(true)} disabled={isGeneratingPrompt}>
                  <Ionicons name="refresh" size={20} color="#648767" />
                </TouchableOpacity>
              )}
            </View>
            {isGeneratingPrompt ? (
              <ActivityIndicator size="small" color="#648767" style={styles.promptLoader} />
            ) : (
              <Text style={styles.promptText}>{prompt}</Text>
            )}
          </View>
        )}

        <MoodSelector />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Write your thoughts here..."
            placeholderTextColor="#9ca3af"
            multiline
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
          />
        </View>

        {voiceUri && (
          <View style={styles.voiceContainer}>
            <Ionicons name="mic" size={16} color="'#648767" />
            <Text style={styles.voiceText}>Voice recording attached</Text>
            <TouchableOpacity onPress={() => VoiceService.playRecording(voiceUri)}>
              <Ionicons name="play" size={20} color="#648767"/>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.voiceButton}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={24}
            color={isRecording ? '#ef4444' : '#648767'}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Entry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:'#fff',
    //backgroundColor: '#f9fafb',
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
  promptContainer: {
    //backgroundColor:'#aeef9e', light green
    backgroundColor:'#d9f1f1', //silver
    //backgroundColor:'#cee7e6', //light cyan
    //backgroundColor: '#ede9fe',
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
    color:'#648767',
    //color: '#6366f1',
    flex: 1,
  },
  promptLoader: {
    marginTop: 8,
  },
  promptText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  moodContainer: {
    marginBottom: 16,
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
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
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
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

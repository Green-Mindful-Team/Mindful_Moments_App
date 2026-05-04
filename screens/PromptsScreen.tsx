import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../constants/ThemeContext';
import AIService from '../services/AIService';
import StorageService from '../services/StorageService';

interface SavedPrompt {
  prompt: string;
  category?: string;
  savedAt: string;
}

//added after siri sent files
type RootStackParamList = {
  Prompts: undefined;
  NewEntry: { initialPrompt?: string };
};
//end

export default function PromptsScreen() {
  //siri's original code
  //const navigation = useNavigation();
  //end
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const colors = useTheme();
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [customPrompt, setCustomPrompt] = useState('');
  const [editingSavedAt, setEditingSavedAt] = useState<string | null>(null);

  const categories = [
    { id: 'gratitude', label: 'Gratitude', icon: 'heart' },
    { id: 'reflection', label: 'Reflection', icon: 'eye' },
    { id: 'goals', label: 'Goals', icon: 'flag' },
    { id: 'mindfulness', label: 'Mindfulness', icon: 'leaf' },
    { id: 'relationships', label: 'Relationships', icon: 'people' },
    { id: 'growth', label: 'Growth', icon: 'trending-up' },
  ];

  useEffect(() => {
    loadSavedPrompts();
  }, []);

  const loadSavedPrompts = async () => {
    const prompts = await StorageService.getSavedPrompts();
    setSavedPrompts(prompts);
  };

  const generatePrompt = async (category?: string) => {
    setIsGenerating(true);
    try {
      const response = await AIService.generateDailyPrompt(category);
      setCurrentPrompt(response.prompt);
      setSelectedCategory(category);
    } catch (error) {
      console.error('Error generating prompt:', error);
      Alert.alert('Error', 'Failed to generate prompt. Please try again.');
    }
    setIsGenerating(false);
  };

  const savePrompt = async () => {
    if (!currentPrompt) return;

    const isDuplicate = savedPrompts.some(
      p => p.prompt.trim().toLowerCase() === currentPrompt.trim().toLowerCase()
    );
    if (isDuplicate) {
      Alert.alert('Duplicate Prompt', 'This prompt is already saved.');
      return;
    }

    const saved = await StorageService.savePrompt(currentPrompt, selectedCategory);
    if (saved) {
      Alert.alert('Saved', 'Prompt saved to favorites!');
      loadSavedPrompts();
    } else {
      Alert.alert('Duplicate Prompt', 'This prompt is already saved.');
    }
  };

  const usePrompt = () => {
    if (!currentPrompt) return;
    navigation.navigate('NewEntry', { initialPrompt: currentPrompt });
    //top one was original code
    //navigation.navigate('NewEntry' as never, { initialPrompt: currentPrompt } as never);
    //navigation.navigate('NewEntry' as any, { initialPrompt: currentPrompt });
  };

  const addCustomPrompt = async () => {
    const trimmed = customPrompt.trim();
    if (!trimmed) {
      Alert.alert('Empty Prompt', 'Please type a prompt before adding it.');
      return;
    }

    const isDuplicate = savedPrompts.some(
      p =>
        p.savedAt !== editingSavedAt &&
        p.prompt.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      Alert.alert('Duplicate Prompt', 'A prompt with the same text already exists.');
      return;
    }

    const saved = editingSavedAt
      ? await StorageService.updatePrompt(editingSavedAt, trimmed, 'custom')
      : await StorageService.savePrompt(trimmed, 'custom');

    if (saved) {
      setCurrentPrompt(trimmed);
      setSelectedCategory('custom');
      setCustomPrompt('');
      setEditingSavedAt(null);
      await loadSavedPrompts();
      Alert.alert(
        editingSavedAt ? 'Updated' : 'Added',
        editingSavedAt ? 'Your custom prompt has been updated.' : 'Your custom prompt has been saved.'
      );
    } else {
      Alert.alert('Duplicate Prompt', 'A prompt with the same text already exists.');
    }
  };

  const startEditPrompt = (prompt: SavedPrompt) => {
    setCustomPrompt(prompt.prompt);
    setSelectedCategory(prompt.category || 'custom');
    setEditingSavedAt(prompt.savedAt);
  };

  const cancelEditPrompt = () => {
    setCustomPrompt('');
    setEditingSavedAt(null);
    setSelectedCategory(undefined);
  };

  const handleDeletePrompt = (prompt: SavedPrompt) => {
    Alert.alert(
      'Delete Prompt',
      'Do you want to remove this saved prompt?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const deleted = await StorageService.deletePrompt(prompt.savedAt);
            if (deleted) {
              if (editingSavedAt === prompt.savedAt) {
                cancelEditPrompt();
              }
              await loadSavedPrompts();
            } else {
              Alert.alert('Error', 'Failed to delete prompt.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Writing Prompts</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Get inspired with AI-generated prompts for your journal
        </Text>
      </View>

      <View style={styles.categoryContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories</Text>
        <View style={styles.categoryGrid}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                { backgroundColor: colors.card, borderColor: colors.textMuted },
                selectedCategory === category.id && { borderColor: colors.journalButton, backgroundColor: colors.sleepBox },
              ]}
              onPress={() => generatePrompt(category.id)}
            >
              <Ionicons
                name={category.icon as any}
                size={24}
                color={selectedCategory === category.id ? colors.journalButton : colors.textMuted}
              />
              <Text
                style={[
                  styles.categoryLabel,
                  { color: colors.textMuted },
                  selectedCategory === category.id && { color: colors.journalButton },
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.customPromptContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {editingSavedAt ? 'Edit Saved Prompt' : 'Create Your Own Prompt'}
        </Text>
        <TextInput
          style={[
            styles.customPromptInput,
            {
              backgroundColor: colors.card,
              borderColor: colors.textMuted,
              color: colors.text,
            }
          ]}
          placeholder="Type your own journaling prompt..."
          placeholderTextColor={colors.textMuted}
          value={customPrompt}
          onChangeText={setCustomPrompt}
          multiline
        />
        <View style={styles.customPromptActions}>
          <TouchableOpacity 
            style={[styles.customPromptButton, { backgroundColor: colors.journalButton }]} 
            onPress={addCustomPrompt}
          >
            <Ionicons name={editingSavedAt ? 'create-outline' : 'add-circle-outline'} size={20} color="#fff" />
            <Text style={styles.customPromptButtonText}>
              {editingSavedAt ? 'Update Prompt' : 'Add Custom Prompt'}
            </Text>
          </TouchableOpacity>
          {editingSavedAt && (
            <TouchableOpacity 
              style={[styles.cancelEditButton, { backgroundColor: colors.textMuted }]} 
              onPress={cancelEditPrompt}
            >
              <Text style={[styles.cancelEditButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.generateButton, { backgroundColor: colors.journalButton }]}
        onPress={() => generatePrompt()}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="sparkles" size={20} color="#fff" />
            <Text style={styles.generateButtonText}>Generate Random Prompt</Text>
          </>
        )}
      </TouchableOpacity>

      {currentPrompt && (
        <View style={[styles.promptCard, { backgroundColor: colors.sleepBox }]}>
          <View style={styles.promptHeader}>
            <Ionicons name="bulb" size={24} color={colors.journalButton} />
            <Text style={[styles.promptCardTitle, { color: colors.journalButton }]}>Today's Prompt</Text>
          </View>
          <Text style={[styles.promptText, { color: colors.text }]}>{currentPrompt}</Text>
          <View style={styles.promptActions}>
            <TouchableOpacity style={[styles.useButton, { backgroundColor: colors.card }]} onPress={usePrompt}>
              <Ionicons name="create-outline" size={18} color={colors.journalButton} />
              <Text style={[styles.useButtonText, { color: colors.journalButton }]}>Use This Prompt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.card }]} onPress={savePrompt}>
              <Ionicons name="bookmark-outline" size={18} color={colors.journalButton} />
              <Text style={[styles.saveButtonText, { color: colors.journalButton }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {savedPrompts.length > 0 && (
        <View style={styles.savedSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Saved Prompts</Text>
          {savedPrompts.map((prompt) => (
            <View key={prompt.savedAt} style={[
              styles.savedPromptCard, 
              { 
                backgroundColor: colors.card, 
                borderLeftColor: colors.journalButton 
              }
            ]}>
              <TouchableOpacity
              onPress={() => navigation.navigate('NewEntry', { initialPrompt: prompt.prompt })}
              //onPress={() => navigation.navigate('NewEntry' as any, { initialPrompt: prompt.prompt })}
                //onPress={() => navigation.navigate('NewEntry' as never, { initialPrompt: prompt.prompt } as never)}
                //last one was original code
              >
                <Text style={[styles.savedPromptText, { color: colors.text }]}>{prompt.prompt}</Text>
                {prompt.category && (
                  <Text style={[styles.savedPromptCategory, { color: colors.journalButton }]}>{prompt.category}</Text>
                )}
              </TouchableOpacity>
              <View style={styles.savedPromptActions}>
                <TouchableOpacity
                  style={[styles.savedActionButton, { backgroundColor: colors.background }]}
                  onPress={() => startEditPrompt(prompt)}
                >
                  <Ionicons name="create-outline" size={16} color={colors.journalButton} />
                  <Text style={[styles.savedActionText, { color: colors.journalButton }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.savedActionButton, { backgroundColor: colors.background }]}
                  onPress={() => handleDeletePrompt(prompt)}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <Text style={[styles.savedActionText, styles.deleteActionText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
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
    marginBottom: 24,
  },
  title: {
    marginTop: 50,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  customPromptContainer: {
    marginBottom: 24,
  },
  customPromptInput: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  customPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
    width: 200,
    height: 50,
  },
  customPromptButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  customPromptActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelEditButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cancelEditButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  promptCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  promptCardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  promptText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  promptActions: {
    flexDirection: 'row',
    gap: 12,
  },
  useButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    padding: 12,
  },
  useButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 20,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  savedSection: {
    marginTop: 8,
  },
  savedPromptCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  savedPromptText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  savedPromptCategory: {
    fontSize: 12,
    fontWeight: '500',
  },
  savedPromptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  savedActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  savedActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteActionText: {
    color: '#ef4444',
  },
});

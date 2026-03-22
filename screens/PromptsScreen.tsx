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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Writing Prompts</Text>
        <Text style={styles.subtitle}>
          Get inspired with AI-generated prompts for your journal
        </Text>
      </View>

      <View style={styles.categoryContainer}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoryGrid}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                selectedCategory === category.id && styles.categoryCardActive,
              ]}
              onPress={() => generatePrompt(category.id)}
            >
              <Ionicons
                name={category.icon as any}
                size={24}
                color={selectedCategory === category.id ? '#6366f1' : '#6b7280'}
              />
              <Text
                style={[
                  styles.categoryLabel,
                  selectedCategory === category.id && styles.categoryLabelActive,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.customPromptContainer}>
        <Text style={styles.sectionTitle}>
          {editingSavedAt ? 'Edit Saved Prompt' : 'Create Your Own Prompt'}
        </Text>
        <TextInput
          style={styles.customPromptInput}
          placeholder="Type your own journaling prompt..."
          placeholderTextColor="#9ca3af"
          value={customPrompt}
          onChangeText={setCustomPrompt}
          multiline
        />
        <View style={styles.customPromptActions}>
          <TouchableOpacity style={styles.customPromptButton} onPress={addCustomPrompt}>
            <Ionicons name={editingSavedAt ? 'create-outline' : 'add-circle-outline'} size={20} color="#fff" />
            <Text style={styles.customPromptButtonText}>
              {editingSavedAt ? 'Update Prompt' : 'Add Custom Prompt'}
            </Text>
          </TouchableOpacity>
          {editingSavedAt && (
            <TouchableOpacity style={styles.cancelEditButton} onPress={cancelEditPrompt}>
              <Text style={styles.cancelEditButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.generateButton}
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
        <View style={styles.promptCard}>
          <View style={styles.promptHeader}>
            <Ionicons name="bulb" size={24} color="#6366f1" />
            <Text style={styles.promptCardTitle}>Today's Prompt</Text>
          </View>
          <Text style={styles.promptText}>{currentPrompt}</Text>
          <View style={styles.promptActions}>
            <TouchableOpacity style={styles.useButton} onPress={usePrompt}>
              <Ionicons name="create-outline" size={18} color="#6366f1" />
              <Text style={styles.useButtonText}>Use This Prompt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={savePrompt}>
              <Ionicons name="bookmark-outline" size={18} color="#6366f1" />
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {savedPrompts.length > 0 && (
        <View style={styles.savedSection}>
          <Text style={styles.sectionTitle}>Saved Prompts</Text>
          {savedPrompts.map((prompt) => (
            <View key={prompt.savedAt} style={styles.savedPromptCard}>
              <TouchableOpacity
              onPress={() => navigation.navigate('NewEntry', { initialPrompt: prompt.prompt })}
              //onPress={() => navigation.navigate('NewEntry' as any, { initialPrompt: prompt.prompt })}
                //onPress={() => navigation.navigate('NewEntry' as never, { initialPrompt: prompt.prompt } as never)}
                //last one was original code
              >
                <Text style={styles.savedPromptText}>{prompt.prompt}</Text>
                {prompt.category && (
                  <Text style={styles.savedPromptCategory}>{prompt.category}</Text>
                )}
              </TouchableOpacity>
              <View style={styles.savedPromptActions}>
                <TouchableOpacity
                  style={styles.savedActionButton}
                  onPress={() => startEditPrompt(prompt)}
                >
                  <Ionicons name="create-outline" size={16} color="#6366f1" />
                  <Text style={styles.savedActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.savedActionButton}
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
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  categoryContainer: {
    marginBottom: 24,
  },
  customPromptContainer: {
    marginBottom: 24,
  },
  customPromptInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  customPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 12,
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
  },
  cancelEditButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cancelEditButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  categoryCardActive: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: '#6366f1',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
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
    backgroundColor: '#ede9fe',
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
    color: '#6366f1',
  },
  promptText: {
    fontSize: 16,
    color: '#4b5563',
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
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  useButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 20,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  savedSection: {
    marginTop: 8,
  },
  savedPromptCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  savedPromptText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
    marginBottom: 4,
  },
  savedPromptCategory: {
    fontSize: 12,
    color: '#6366f1',
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
    backgroundColor: '#f3f4f6',
  },
  savedActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  deleteActionText: {
    color: '#ef4444',
  },
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptionService from './EncryptionService';

export interface JournalEntry {
  id: string;
  content: string;
  mood?: number;
  date: string;
  prompt?: string;
  /** @deprecated use voiceUris — kept for older saved entries */
  voiceUri?: string;
  /** Voice clips in recording order (append new recordings). */
  voiceUris?: string[];
  createdAt: string;
  updatedAt?: string;
}

/** All voice URIs for an entry (legacy single `voiceUri` or `voiceUris`). */
export function getJournalEntryVoiceUris(entry: Pick<JournalEntry, 'voiceUri' | 'voiceUris'>): string[] {
  if (entry.voiceUris && entry.voiceUris.length > 0) {
    return [...entry.voiceUris];
  }
  if (entry.voiceUri) {
    return [entry.voiceUri];
  }
  return [];
}

/** Normalize to `voiceUris` only (no `voiceUri`) for storage and UI. */
export function normalizeJournalEntry(entry: JournalEntry): JournalEntry {
  const uris = getJournalEntryVoiceUris(entry);
  const { voiceUri, voiceUris, ...rest } = entry;
  const out: JournalEntry = { ...rest };
  if (uris.length > 0) {
    out.voiceUris = uris;
  }
  return out;
}

const ENTRIES_KEY = 'journal_entries';
const MOODS_KEY = 'mood_history';
const PROMPTS_KEY = 'saved_prompts';
const DAILY_PROMPT_KEY = 'daily_prompt';

class StorageService {
  private getDateOnly(value: string): string {
    return new Date(value).toISOString().split('T')[0];
  }

  private async getRawMoodHistory(): Promise<Array<{ date: string; mood: number }>> {
    const data = await AsyncStorage.getItem(MOODS_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  }

  private async syncMoodHistoryWithEntries(): Promise<Array<{ date: string; mood: number }>> {
    const allEntries = await this.getAllEntries();
    const moodsByDate = new Map<string, number[]>();

    // Collect all moods per day
    for (const entry of allEntries) {
      if (entry.mood === undefined) continue;
      const dateOnly = this.getDateOnly(entry.date);
      const list = moodsByDate.get(dateOnly) ?? [];
      list.push(entry.mood);
      moodsByDate.set(dateOnly, list);
    }

    // Average mood per day (rounded to 1 decimal)
    const syncedMoodHistory = Array.from(moodsByDate.entries())
      .map(([date, moods]) => {
        const sum = moods.reduce((a, b) => a + b, 0);
        const avg = Math.round((sum / moods.length) * 10) / 10;
        return { date, mood: avg };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const currentMoodHistory = await this.getRawMoodHistory();
    if (JSON.stringify(currentMoodHistory) !== JSON.stringify(syncedMoodHistory)) {
      await AsyncStorage.setItem(MOODS_KEY, JSON.stringify(syncedMoodHistory));
    }

    return syncedMoodHistory;
  }

  /**
   * Save a journal entry (encrypted)
   */
  async saveEntry(entry: JournalEntry): Promise<boolean> {
    try {
      const toSave = normalizeJournalEntry(entry);
      const entries = await this.getAllEntries();
      const existingIndex = entries.findIndex(e => e.id === toSave.id);

      if (existingIndex >= 0) {
        entries[existingIndex] = toSave;
      } else {
        entries.push(toSave);
      }

      // Encrypt all entries before storing
      const encryptedEntries = await EncryptionService.encryptEntries(entries);
      await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(encryptedEntries));
      await this.syncMoodHistoryWithEntries();

      return true;
    } catch (error) {
      console.error('Error saving entry:', error);
      return false;
    }
  }

  /**
   * Get all journal entries (decrypted)
   */
  async getAllEntries(): Promise<JournalEntry[]> {
    try {
      const encryptedData = await AsyncStorage.getItem(ENTRIES_KEY);
      if (!encryptedData) {
        return [];
      }

      const encryptedEntries: string[] = JSON.parse(encryptedData);
      const entries = await EncryptionService.decryptEntries(encryptedEntries);
      
      // Sort by date (newest first); normalize voice fields for consumers
      return entries
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((e) =>
          normalizeJournalEntry({
            ...e,
            createdAt: e.createdAt ?? e.date,
          } as JournalEntry)
        );
    } catch (error) {
      console.error('Error getting entries:', error);
      return [];
    }
  }

  /**
   * Get a single entry by ID
   */
  async getEntry(id: string): Promise<JournalEntry | null> {
    try {
      const entries = await this.getAllEntries();
      return entries.find(e => e.id === id) || null;
    } catch (error) {
      console.error('Error getting entry:', error);
      return null;
    }
  }

  /**
   * Delete an entry
   */
  async deleteEntry(id: string): Promise<boolean> {
    try {
      const entries = await this.getAllEntries();
      const entryToDelete = entries.find(e => e.id === id);
      if (!entryToDelete) {
        return false;
      }

      const filtered = entries.filter(e => e.id !== id);
      
      const encryptedEntries = await EncryptionService.encryptEntries(filtered);
      await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(encryptedEntries));
      await this.syncMoodHistoryWithEntries();
      
      return true;
    } catch (error) {
      console.error('Error deleting entry:', error);
      return false;
    }
  }

  /**
   * Save mood data
   */
  async saveMood(date: string, mood: number): Promise<boolean> {
    try {
      const moods = await this.getMoodHistory();
      const existingIndex = moods.findIndex(m => m.date === date);
      
      if (existingIndex >= 0) {
        moods[existingIndex].mood = mood;
      } else {
        moods.push({ date, mood });
      }

      await AsyncStorage.setItem(MOODS_KEY, JSON.stringify(moods));
      return true;
    } catch (error) {
      console.error('Error saving mood:', error);
      return false;
    }
  }

  /**
   * Get mood history
   */
  async getMoodHistory(): Promise<Array<{ date: string; mood: number }>> {
    try {
      return await this.syncMoodHistoryWithEntries();
    } catch (error) {
      console.error('Error getting mood history:', error);
      return [];
    }
  }

  /**
   * Get mood history for a date range
   */
  async getMoodHistoryRange(startDate: Date, endDate: Date): Promise<Array<{ date: string; mood: number }>> {
    try {
      const moods = await this.getMoodHistory();
      return moods.filter(m => {
        const date = new Date(m.date);
        return date >= startDate && date <= endDate;
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error getting mood range:', error);
      return [];
    }
  }

  /**
   * Save favorite prompts
   */
  async savePrompt(prompt: string, category?: string): Promise<boolean> {
    try {
      const prompts = await this.getSavedPrompts();
      const normalizedPrompt = prompt.trim().toLowerCase();
      const isDuplicate = prompts.some(
        p => p.prompt.trim().toLowerCase() === normalizedPrompt
      );

      if (isDuplicate) {
        return false;
      }

      prompts.push({ prompt: prompt.trim(), category, savedAt: new Date().toISOString() });
      await AsyncStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
      return true;
    } catch (error) {
      console.error('Error saving prompt:', error);
      return false;
    }
  }

  /**
   * Get saved prompts
   */
  async getSavedPrompts(): Promise<Array<{ prompt: string; category?: string; savedAt: string }>> {
    try {
      const data = await AsyncStorage.getItem(PROMPTS_KEY);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting prompts:', error);
      return [];
    }
  }

  /**
   * Update a saved prompt
   */
  async updatePrompt(savedAt: string, prompt: string, category?: string): Promise<boolean> {
    try {
      const prompts = await this.getSavedPrompts();
      const normalizedPrompt = prompt.trim().toLowerCase();
      const isDuplicate = prompts.some(
        p => p.savedAt !== savedAt && p.prompt.trim().toLowerCase() === normalizedPrompt
      );

      if (isDuplicate) {
        return false;
      }

      const updatedPrompts = prompts.map(p =>
        p.savedAt === savedAt
          ? { ...p, prompt: prompt.trim(), category }
          : p
      );

      await AsyncStorage.setItem(PROMPTS_KEY, JSON.stringify(updatedPrompts));
      return true;
    } catch (error) {
      console.error('Error updating prompt:', error);
      return false;
    }
  }

  /**
   * Delete a saved prompt
   */
  async deletePrompt(savedAt: string): Promise<boolean> {
    try {
      const prompts = await this.getSavedPrompts();
      const filteredPrompts = prompts.filter(p => p.savedAt !== savedAt);
      await AsyncStorage.setItem(PROMPTS_KEY, JSON.stringify(filteredPrompts));
      return true;
    } catch (error) {
      console.error('Error deleting prompt:', error);
      return false;
    }
  }

  /**
   * Save today's prompt
   */
  async saveDailyPrompt(prompt: string, date: string): Promise<boolean> {
    try {
      await AsyncStorage.setItem(DAILY_PROMPT_KEY, JSON.stringify({ prompt, date }));
      return true;
    } catch (error) {
      console.error('Error saving daily prompt:', error);
      return false;
    }
  }

  /**
   * Get today's prompt if it exists
   */
  async getDailyPrompt(): Promise<{ prompt: string; date: string } | null> {
    try {
      const data = await AsyncStorage.getItem(DAILY_PROMPT_KEY);
      if (!data) {
        return null;
      }
      const saved = JSON.parse(data);
      
      // Check if it's for today
      const today = new Date().toISOString().split('T')[0];
      const savedDate = new Date(saved.date).toISOString().split('T')[0];
      
      if (savedDate === today) {
        return saved;
      }
      
      return null; // Prompt is from a different day
    } catch (error) {
      console.error('Error getting daily prompt:', error);
      return null;
    }
  }

  /**
   * Clear all data (use with caution)
   */
  async clearAllData(): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove([ENTRIES_KEY, MOODS_KEY, PROMPTS_KEY, DAILY_PROMPT_KEY]);
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }
}

export default new StorageService();

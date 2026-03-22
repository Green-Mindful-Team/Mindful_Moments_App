export interface JournalEntry {
  id: string;
  content: string;
  mood?: number;
  date: string;
  prompt?: string;
  voiceUri?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MoodData {
  date: string;
  mood: number;
}

export interface SavedPrompt {
  prompt: string;
  category?: string;
  savedAt: string;
}

export interface PromptCategory {
  id: string;
  label: string;
  icon: string;
}

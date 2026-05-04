import axios from 'axios';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface PromptResponse {
  prompt: string;
  category?: string;
}

export interface SummaryResponse {
  summary: string;
  insights: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface AffirmationResponse {
  affirmation: string;
  tip: string;
}

class AIService {
  /**
   * Generate a daily writing prompt
   */
  async generateDailyPrompt(category?: string): Promise<PromptResponse> {
    try {
      if (!OPENAI_API_KEY) {
        // Fallback prompts if API key is not set
        return this.getFallbackPrompt(category);
      }

      const categories = category 
        ? [category]
        : ['gratitude', 'reflection', 'goals', 'mindfulness', 'relationships', 'growth'];

      const selectedCategory = categories[Math.floor(Math.random() * categories.length)];

      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a mindfulness and journaling coach. Generate thoughtful, reflective writing prompts that encourage self-discovery and mental wellness.'
            },
            {
              role: 'user',
              content: `Generate a ${selectedCategory} journaling prompt. Make it specific, thought-provoking, and encouraging. Return only the prompt text.`
            }
          ],
          max_tokens: 100,
          temperature: 0.8,
        },
        {
          timeout: 4000,
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const prompt = response.data.choices[0].message.content.trim();
      return { prompt, category: selectedCategory };
    } catch (error) {
      console.error('Error generating prompt:', error);
      return this.getFallbackPrompt(category);
    }
  }

  /**
   * Generate summary and insights from journal entries
   */
  async generateSummary(entries: string[]): Promise<SummaryResponse> {
    try {
      if (!OPENAI_API_KEY || entries.length === 0) {
        return {
          summary: 'No entries to summarize.',
          insights: [],
          sentiment: 'neutral',
        };
      }

      const entriesText = entries.slice(-10).join('\n\n'); // Last 10 entries

      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a mental wellness coach. Analyze journal entries and provide insights about mood patterns, themes, and growth opportunities. Be supportive and encouraging.'
            },
            {
              role: 'user',
              content: `Analyze these journal entries and provide:\n1. A brief summary (2-3 sentences)\n2. 3 key insights about patterns or themes\n3. Overall sentiment (positive/neutral/negative)\n\nEntries:\n${entriesText}`
            }
          ],
          max_tokens: 300,
          temperature: 0.7,
        },
        {
          timeout: 4000,
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0].message.content;

      //below is the original code giving me issues (JC)
      //const lines = content.split('\n').filter(line => line.trim());
      const lines: string[] = content
      .split('\n')
      .filter((line: string) => line.trim() !== '');
      
      const summary = lines[0] || 'Summary unavailable';

      //below is the original code giving me issues
      //const insights = lines.slice(1, 4).filter(line => line.trim()) || [];

      const insights: string[] = lines
      .slice(1, 4)
      .filter((line: string) => line.trim() !== '');
      const sentimentMatch = content.toLowerCase().match(/(positive|neutral|negative)/);
      const sentiment = (sentimentMatch?.[1] as 'positive' | 'neutral' | 'negative') || 'neutral';

      return { summary, insights, sentiment };
    } catch (error) {
      console.error('Error generating summary:', error);
      return {
        summary: 'Unable to generate summary at this time.',
        insights: [],
        sentiment: 'neutral',
      };
    }
  }

  /**
   * Generate daily affirmation or mindfulness tip
   */
  async generateAffirmation(): Promise<AffirmationResponse> {
    try {
      if (!OPENAI_API_KEY) {
        return this.getFallbackAffirmation();
      }

      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a mindfulness and wellness coach. Generate a daily affirmation and a practical mindfulness tip. Be encouraging and supportive.'
            },
            {
              role: 'user',
              content: 'Generate a daily affirmation (one sentence) and a mindfulness tip (one sentence). Format as: Affirmation: [text] Tip: [text]'
            }
          ],
          max_tokens: 150,
          temperature: 0.8,
        },
        {
          timeout: 4000,
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0].message.content;
      const affirmationMatch = content.match(/Affirmation:\s*(.+?)(?:\n|Tip:|$)/i);
      const tipMatch = content.match(/Tip:\s*(.+?)$/i);

      return {
        affirmation: affirmationMatch?.[1]?.trim() || 'You are capable of great things today.',
        tip: tipMatch?.[1]?.trim() || 'Take a moment to breathe deeply and center yourself.',
      };
    } catch (error) {
      console.error('Error generating affirmation:', error);
      return this.getFallbackAffirmation();
    }
  }

  /**
   * Fallback affirmations when API is unavailable
   */
  private getFallbackAffirmation(): AffirmationResponse {
    const affirmations = [
      'I am capable of handling whatever comes my way today.',
      'I choose to focus on the positive aspects of my life.',
      'I am worthy of love, happiness, and peace.',
      'Every day is a new opportunity to grow and learn.',
      'I trust in my ability to overcome challenges.',
      'I am grateful for the present moment and all it offers.',
      'I am enough, just as I am.',
      'I choose to be kind to myself and others today.',
    ];

    const tips = [
      'Take three deep breaths when you feel overwhelmed.',
      'Practice gratitude by writing down one thing you\'re thankful for.',
      'Spend 5 minutes in silence, just observing your thoughts.',
      'Do one act of kindness for yourself today.',
      'Notice the beauty around you - a flower, the sky, a smile.',
      'Listen to your body and give it what it needs.',
      'Set aside time for something that brings you joy.',
      'Remember that it\'s okay to take breaks and rest.',
    ];

    const affirmation = affirmations[Math.floor(Math.random() * affirmations.length)];
    const tip = tips[Math.floor(Math.random() * tips.length)];

    return { affirmation, tip };
  }

  /**
   * Fallback prompts when API is unavailable
   */
  private getFallbackPrompt(category?: string): PromptResponse {
    const prompts: Record<string, string[]> = {
      gratitude: [
        'What are three things you\'re grateful for today?',
        'Who made a positive impact on your day?',
        'What small moment brought you joy today?',
      ],
      reflection: [
        'What did you learn about yourself today?',
        'How did you handle a challenge today?',
        'What would you tell your past self from a year ago?',
      ],
      goals: [
        'What progress did you make toward your goals today?',
        'What would you like to accomplish this week?',
        'What small step can you take tomorrow?',
      ],
      mindfulness: [
        'How did you practice self-care today?',
        'What emotions did you notice throughout the day?',
        'What helped you stay present today?',
      ],
      relationships: [
        'How did you connect with someone today?',
        'What relationship are you grateful for?',
        'How can you strengthen a relationship this week?',
      ],
      growth: [
        'What mistake taught you something valuable?',
        'How have you grown this month?',
        'What new perspective did you gain today?',
      ],
    };

    const selectedCategory = category || Object.keys(prompts)[Math.floor(Math.random() * Object.keys(prompts).length)];
    const categoryPrompts = prompts[selectedCategory] || prompts.gratitude;
    const prompt = categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];

    return { prompt, category: selectedCategory };
  }
}

export default new AIService();

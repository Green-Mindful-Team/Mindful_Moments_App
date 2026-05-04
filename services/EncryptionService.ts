import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const ENCRYPTION_KEY_NAME = 'journal_encryption_key';

class EncryptionService {
  private encryptionKey: string | null = null;

  /**
   * Get or generate encryption key
   */
  private async getEncryptionKey(): Promise<string> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    try {
      // Try to retrieve existing key
      let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);
      
      if (!key) {
        // Generate new key if none exists
        key = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${Date.now()}-${Math.random()}-${await Crypto.getRandomBytesAsync(16)}`
        );
        await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, key);
      }

      this.encryptionKey = key;
      return key;
    } catch (error) {
      console.error('Error getting encryption key:', error);
      // Fallback to a simple key (not recommended for production)
      return 'fallback-key-not-secure';
    }
  }

  /**
   * Simple XOR encryption (suitable for local storage)
   * For production, consider using AES encryption
   */
  private async encrypt(text: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      let encrypted = '';
      
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const keyCharCode = key.charCodeAt(i % key.length);
        encrypted += String.fromCharCode(charCode ^ keyCharCode);
      }

      // Convert to base64 for safe storage
      return btoa(encrypted);
    } catch (error) {
      console.error('Error encrypting:', error);
      return text; // Return unencrypted on error
    }
  }

  /**
   * Decrypt encrypted text
   */
  private async decrypt(encryptedText: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      
      // Decode from base64
      const text = atob(encryptedText);
      let decrypted = '';
      
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const keyCharCode = key.charCodeAt(i % key.length);
        decrypted += String.fromCharCode(charCode ^ keyCharCode);
      }

      return decrypted;
    } catch (error) {
      console.error('Error decrypting:', error);
      return encryptedText; // Return as-is on error
    }
  }

  /**
   * Encrypt journal entry data
   */
  async encryptEntry(entry: {
    id: string;
    content: string;
    mood?: number;
    date: string;
    prompt?: string;
    voiceUri?: string;
    voiceUris?: string[];
    createdAt?: string;
    updatedAt?: string;
  }): Promise<string> {
    const jsonString = JSON.stringify(entry);
    return await this.encrypt(jsonString);
  }

  /**
   * Decrypt journal entry data
   */
  async decryptEntry(encryptedData: string): Promise<{
    id: string;
    content: string;
    mood?: number;
    date: string;
    prompt?: string;
    voiceUri?: string;
    voiceUris?: string[];
    createdAt?: string;
    updatedAt?: string;
  } | null> {
    try {
      const decrypted = await this.decrypt(encryptedData);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Error decrypting entry:', error);
      return null;
    }
  }

  /**
   * Encrypt multiple entries
   */
  async encryptEntries(entries: Array<{
    id: string;
    content: string;
    mood?: number;
    date: string;
    prompt?: string;
    voiceUri?: string;
    voiceUris?: string[];
    createdAt?: string;
    updatedAt?: string;
  }>): Promise<string[]> {
    return Promise.all(entries.map(entry => this.encryptEntry(entry)));
  }

  /**
   * Decrypt multiple entries
   */
  async decryptEntries(encryptedEntries: string[]): Promise<Array<{
    id: string;
    content: string;
    mood?: number;
    date: string;
    prompt?: string;
    voiceUri?: string;
    voiceUris?: string[];
    createdAt?: string;
    updatedAt?: string;
  }>> {
    const decrypted = await Promise.all(
      encryptedEntries.map(entry => this.decryptEntry(entry))
    );
    return decrypted.filter(entry => entry !== null) as Array<{
      id: string;
      content: string;
      mood?: number;
      date: string;
      prompt?: string;
      voiceUri?: string;
      voiceUris?: string[];
      createdAt?: string;
      updatedAt?: string;
    }>;
  }
}

export default new EncryptionService();

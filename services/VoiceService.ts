import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

export interface VoiceRecording {
  uri: string;
  duration: number;
}

class VoiceService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;

  /**
   * Request permissions and prepare audio mode
   */
  async prepareAudio(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Audio permission not granted');
        return false;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      return true;
    } catch (error) {
      console.error('Error preparing audio:', error);
      return false;
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<boolean> {
    try {
      const hasPermission = await this.prepareAudio();
      if (!hasPermission) {
        return false;
      }

      // Stop any existing recording
      if (this.recording) {
        await this.stopRecording();
      }

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }

  /**
   * Stop recording and get the URI
   */
  async stopRecording(): Promise<VoiceRecording | null> {
    try {
      if (!this.recording) {
        return null;
      }

      const status = await this.recording.getStatusAsync();
      await this.recording.stopAndUnloadAsync();
      
      const uri = this.recording.getURI();
      const duration = status.durationMillis ? status.durationMillis / 1000 : 0;

      this.recording = null;

      if (uri) {
        return { uri, duration };
      }

      return null;
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.recording = null;
      return null;
    }
  }

  /**
   * Play a recorded audio file
   */
  async playRecording(uri: string): Promise<boolean> {
    try {
      // Stop any currently playing sound
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      this.sound = sound;

      // Clean up when playback finishes
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          this.sound = null;
        }
      });

      return true;
    } catch (error) {
      console.error('Error playing recording:', error);
      return false;
    }
  }

  /**
   * Stop currently playing audio
   */
  async stopPlayback(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  }

  /**
   * Text-to-speech for prompts or affirmations
   */
  speak(text: string, options?: { language?: string; pitch?: number; rate?: number }): void {
    Speech.speak(text, {
      language: options?.language || 'en',
      pitch: options?.pitch || 1.0,
      rate: options?.rate || 0.9,
    });
  }

  /**
   * Stop text-to-speech
   */
  stopSpeaking(): void {
    Speech.stop();
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.stopRecording();
    await this.stopPlayback();
    this.stopSpeaking();
  }
}

export default new VoiceService();

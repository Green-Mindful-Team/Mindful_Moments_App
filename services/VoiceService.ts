import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';

export interface VoiceRecording {
  uri: string;
  duration: number;
}

/** Emitted whenever playback state changes (for UI: play / pause / resume labels). */
export type VoicePlaybackUI = {
  activeUri: string | null;
  status: 'idle' | 'playing' | 'paused';
};

class VoiceService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private currentPlaybackUri: string | null = null;
  private playbackListeners = new Set<(state: VoicePlaybackUI) => void>();

  private emitPlayback(state: VoicePlaybackUI) {
    this.playbackListeners.forEach((fn) => {
      try {
        fn(state);
      } catch {
        /* ignore listener errors */
      }
    });
  }

  /** Subscribe to play/pause/finish updates. Returns unsubscribe. */
  subscribePlayback(listener: (state: VoicePlaybackUI) => void): () => void {
    this.playbackListeners.add(listener);
    return () => this.playbackListeners.delete(listener);
  }

  getActivePlaybackUri(): string | null {
    return this.currentPlaybackUri;
  }

  /**
   * Play this URI, pause if already playing it, resume if paused on same URI.
   * If another URI is playing, it is stopped and replaced.
   */
  async playOrToggle(uri: string): Promise<boolean> {
    try {
      if (this.sound && this.currentPlaybackUri === uri) {
        const st = await this.sound.getStatusAsync();
        if (st.isLoaded) {
          if (st.isPlaying) {
            await this.sound.pauseAsync();
            this.emitPlayback({ activeUri: uri, status: 'paused' });
          } else {
            await this.sound.playAsync();
            this.emitPlayback({ activeUri: uri, status: 'playing' });
          }
          return true;
        }
      }

      await this.unloadPlaybackInternal();

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, progressUpdateIntervalMillis: 300 }
      );
      this.sound = sound;
      this.currentPlaybackUri = uri;

      // Only handle natural end here; play/pause UI updates come from playOrToggle to avoid spurious "paused" on load.
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) {
          return;
        }
        if (status.didJustFinish) {
          void this.unloadPlaybackInternal();
          this.emitPlayback({ activeUri: null, status: 'idle' });
        }
      });

      this.emitPlayback({ activeUri: uri, status: 'playing' });
      return true;
    } catch (error) {
      console.error('Error playOrToggle:', error);
      this.emitPlayback({ activeUri: null, status: 'idle' });
      return false;
    }
  }

  /** @deprecated Prefer playOrToggle — kept for any old call sites */
  async playRecording(uri: string): Promise<boolean> {
    return this.playOrToggle(uri);
  }

  private async unloadPlaybackInternal(): Promise<void> {
    if (this.sound) {
      try {
        this.sound.setOnPlaybackStatusUpdate(null);
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (e) {
        console.warn('unloadPlayback', e);
      }
      this.sound = null;
    }
    this.currentPlaybackUri = null;
  }

  /** Stop playback and unload (e.g. when leaving screen or deleting audio). */
  async stopPlayback(): Promise<void> {
    await this.unloadPlaybackInternal();
    this.emitPlayback({ activeUri: null, status: 'idle' });
  }

  /** Best-effort delete of a local recording file. */
  async deleteVoiceFile(uri: string): Promise<void> {
    try {
      if (this.currentPlaybackUri === uri) {
        await this.stopPlayback();
      }
      if (uri.startsWith('file:') || uri.startsWith('content:')) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch (e) {
      console.warn('deleteVoiceFile', e);
    }
  }

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
      const uri = this.recording.getURI();
      const duration = status.durationMillis ? status.durationMillis / 1000 : 0;
      await this.recording.stopAndUnloadAsync();
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

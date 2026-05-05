import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const STORAGE_EMAIL = '@mindful_auth_email';
const STORAGE_SALT = '@mindful_auth_salt';
const SECURE_HASH = 'mindful_auth_password_hash';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (normalized.length < 3) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

async function digestPassword(password: string, saltHex: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${saltHex}:${password}`
  );
}

async function randomSaltHex(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hasStoredAccount(): Promise<boolean> {
  const email = await AsyncStorage.getItem(STORAGE_EMAIL);
  const salt = await AsyncStorage.getItem(STORAGE_SALT);
  const hash = await SecureStore.getItemAsync(SECURE_HASH);
  return Boolean(email && salt && hash);
}

export async function registerCredentials(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }
  if (password.length < 8) {
    return { ok: false, message: 'Password must be at least 8 characters.' };
  }

  const existing = await hasStoredAccount();
  if (existing) {
    return { ok: false, message: 'An account already exists. Please log in instead.' };
  }

  const salt = await randomSaltHex();
  const hash = await digestPassword(password, salt);

  await AsyncStorage.setItem(STORAGE_EMAIL, normalized);
  await AsyncStorage.setItem(STORAGE_SALT, salt);
  await SecureStore.setItemAsync(SECURE_HASH, hash);

  return { ok: true };
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const normalized = normalizeEmail(email);
  if (!normalized || !password) {
    return { ok: false, message: 'Please enter your email and password.' };
  }

  const storedEmail = await AsyncStorage.getItem(STORAGE_EMAIL);
  const salt = await AsyncStorage.getItem(STORAGE_SALT);
  if (!storedEmail || !salt) {
    return { ok: false, message: 'No account found. Create an account first.' };
  }

  const storedHash = await SecureStore.getItemAsync(SECURE_HASH);
  if (!storedHash) {
    return { ok: false, message: 'No account found. Create an account first.' };
  }

  if (normalized !== storedEmail) {
    return { ok: false, message: 'Incorrect email or password.' };
  }

  const hash = await digestPassword(password, salt);
  if (hash !== storedHash) {
    return { ok: false, message: 'Incorrect email or password.' };
  }

  return { ok: true };
}

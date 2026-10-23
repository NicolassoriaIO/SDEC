import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getDatabase, nowISO } from '../database/db';
import { createProfile } from '../database/repositories/profileRepo';
import { isEmail, passwordIssues } from '../utils/validation';

const SESSION_KEY = 'sdec.session.v1';
const HASH_ROUNDS = 150;

async function storageSet(key, value) {
  if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}

async function storageGet(key) {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function storageDelete(key) {
  if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}

export async function hashSecret(secret, salt) {
  let hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${secret}:sdec-local-v1`
  );
  for (let i = 0; i < HASH_ROUNDS; i += 1) {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${hash}:${salt}`);
  }
  return hash;
}

export function generateRecoveryCode() {
  const bytes = Crypto.getRandomBytes(6);
  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

export function normalizeRecoveryCode(code) {
  return String(code || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function cleanEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function saveSession(userId, method) {
  await storageSet(SESSION_KEY, JSON.stringify({ userId, method, savedAt: nowISO() }));
}

async function clearSession() {
  await storageDelete(SESSION_KEY);
}

export async function getCurrentUser() {
  const raw = await storageGet(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (!session?.userId) return null;
    const db = await getDatabase();
    const user = await db.getFirstAsync(
      'SELECT id, email, display_name, auth_provider, created_at FROM users WHERE id = ?',
      [session.userId]
    );
    if (!user) {
      await clearSession();
      return null;
    }
    return user;
  } catch {
    await clearSession();
    return null;
  }
}

export async function register({ name, email, password, confirmPassword }) {
  if (!isEmail(email)) throw new Error('El correo electrónico no es válido.');
  const issues = passwordIssues(password);
  if (issues.length) throw new Error(issues.join(' '));
  if (password !== confirmPassword) throw new Error('Las contraseñas no coinciden.');

  const db = await getDatabase();
  const normalizedEmail = cleanEmail(email);
  const existing = await db.getFirstAsync('SELECT id FROM users WHERE lower(email) = ?', [normalizedEmail]);
  if (existing) throw new Error('Ya existe una cuenta con este correo.');
  const userId = `user_${Crypto.randomUUID()}`;
  const salt = Crypto.randomUUID();
  const recoveryCode = generateRecoveryCode();
  const recoverySalt = Crypto.randomUUID();
  const [passwordHash, recoveryHash] = await Promise.all([
    hashSecret(password, salt),
    hashSecret(normalizeRecoveryCode(recoveryCode), recoverySalt),
  ]);
  const now = nowISO();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO users (id, email, display_name, password_hash, password_salt, recovery_hash, recovery_salt, auth_provider, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'local', ?, ?)`,
      [userId, normalizedEmail, String(name).trim(), passwordHash, salt, recoveryHash, recoverySalt, now, now]
    );
  });
  await createProfile(userId, { email: normalizedEmail, displayName: String(name).trim() });
  await saveSession(userId, 'local');
  return { user: await getCurrentUser(), recoveryCode };
}

export async function login({ email, password }) {
  if (!isEmail(email)) throw new Error('El correo electrónico no es válido.');
  if (!password) throw new Error('Introduce tu contraseña.');

  const db = await getDatabase();
  const user = await db.getFirstAsync('SELECT * FROM users WHERE lower(email) = ?', [cleanEmail(email)]);
  if (!user || user.auth_provider !== 'local' || !user.password_hash) {
    throw new Error('Correo o contraseña incorrectos.');
  }
  const hash = await hashSecret(password, user.password_salt);
  if (hash !== user.password_hash) {
    throw new Error('Correo o contraseña incorrectos.');
  }
  await saveSession(user.id, 'local');
  return getCurrentUser();
}

export async function logout() {
  await clearSession();
}

export async function recoverLocalAccount({ email, recoveryCode, newPassword, confirmPassword }) {
  if (passwordIssues(newPassword).length) throw new Error(passwordIssues(newPassword).join(' '));
  if (newPassword !== confirmPassword) throw new Error('Las contraseñas no coinciden.');
  const db = await getDatabase();
  const user = await db.getFirstAsync('SELECT * FROM users WHERE lower(email) = ?', [cleanEmail(email)]);
  if (!user || !user.recovery_hash) throw new Error('Correo o código de recuperación incorrectos.');
  const hash = await hashSecret(normalizeRecoveryCode(recoveryCode), user.recovery_salt);
  if (hash !== user.recovery_hash) throw new Error('Correo o código de recuperación incorrectos.');
  const salt = Crypto.randomUUID();
  const passwordHash = await hashSecret(newPassword, salt);
  await db.runAsync('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?', [
    passwordHash,
    salt,
    nowISO(),
    user.id,
  ]);
}

export async function regenerateRecoveryCode(userId) {
  const db = await getDatabase();
  const code = generateRecoveryCode();
  const salt = Crypto.randomUUID();
  const hash = await hashSecret(normalizeRecoveryCode(code), salt);
  await db.runAsync('UPDATE users SET recovery_hash = ?, recovery_salt = ?, updated_at = ? WHERE id = ?', [
    hash,
    salt,
    nowISO(),
    userId,
  ]);
  return code;
}

export async function changeLocalPassword(userId, { currentPassword, newPassword, confirmPassword }) {
  const db = await getDatabase();
  const user = await db.getFirstAsync('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) throw new Error('Usuario no encontrado.');
  if (user.auth_provider !== 'local' || !user.password_hash || !user.password_salt) {
    throw new Error('Esta cuenta no utiliza autenticación local.');
  }
  const currentHash = await hashSecret(currentPassword, user.password_salt);
  if (currentHash !== user.password_hash) throw new Error('La contraseña actual no es correcta.');
  if (passwordIssues(newPassword).length) throw new Error(passwordIssues(newPassword).join(' '));
  if (newPassword !== confirmPassword) throw new Error('Las contraseñas no coinciden.');
  const salt = Crypto.randomUUID();
  const hash = await hashSecret(newPassword, salt);
  await db.runAsync('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?', [
    hash,
    salt,
    nowISO(),
    userId,
  ]);
}

export async function deleteAccount(userId) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM users WHERE id = ?', [userId]);
  await clearSession();
  return { localDeleted: true };
}

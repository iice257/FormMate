// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — Auth Service
// ═══════════════════════════════════════════
//
// Lightweight auth layer using localStorage.
// Designed to be swapped with Supabase later.
// Supports email/password signup, login, session.
// ═══════════════════════════════════════════

import { save, load, remove } from '../storage/local-store';

const AUTH_KEY = 'auth_session';
const USERS_KEY = 'auth_users';
const DEV_TEST_PASSWORD = 'password';

// ─── Session Management ──────────────────

/**
 * Get current auth session.
 * @returns {{ user: { id, email, name }, isAuthenticated: boolean } | null}
 */
export function getSession() {
  const session = load(AUTH_KEY);
  if (!session) return null;
  return session;
}

/**
 * Check if user is authenticated.
 */
export function isAuthenticated() {
  return getSession() !== null;
}

/**
 * Get current user.
 */
export function getCurrentUser() {
  const session = getSession();
  return session?.user || null;
}

export function isDevAuthEnabled() {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  return Boolean(import.meta.env.DEV) || host === 'localhost' || host === '127.0.0.1';
}

export function getDevTestUsers() {
  if (!isDevAuthEnabled()) return [];
  return [
    { email: 'free@formmate.ai', name: 'Free User', tier: 'free' },
    { email: 'weekly@formmate.ai', name: 'Pro Weekly User', tier: 'weekly' },
    { email: 'monthly@formmate.ai', name: 'Pro Monthly User', tier: 'monthly' }
  ];
}

// ─── Auth Actions ────────────────────────

/**
 * Sign up with email and password.
 */
export async function signUp(email, password, name = '') {
  // Simulate network delay
  await delay(600);

  const users = load(USERS_KEY) || {};

  if (users[email]) {
    throw new Error('An account with this email already exists.');
  }

  const user = {
    id: generateId(),
    email,
    name,
    tier: 'free',
    createdAt: Date.now(),
  };

  // Store user (password hashed in a real implementation)
  users[email] = { ...user, passwordHash: simpleHash(password) };
  save(USERS_KEY, users);

  // Create session
  return persistSession(user);
}

/**
 * Sign in with email and password.
 */
export async function signIn(email, password) {
  await delay(500);

  if (email === 'dev' && password === 'dev') {
    return persistSession({
      id: 'dev_user_admin',
      email: 'dev@formmate.ai',
      name: 'Dev Admin',
      tier: 'monthly',
      provider: 'email'
    });
  }

  const users = load(USERS_KEY) || {};
  const stored = users[email];

  if (!stored) {
    throw new Error('No account found with this email.');
  }

  if (stored.passwordHash !== simpleHash(password)) {
    throw new Error('Incorrect password. Please try again.');
  }

  const user = normalizeUser(stored);
  return persistSession(user);
}

/**
 * Sign in with Google (simulated — stores as social login).
 */
export async function signInWithGoogle() {
  await delay(800);

  // In production, this would open OAuth popup.
  // For now, create a demo social session.
  const email = 'user@gmail.com';
  const users = load(USERS_KEY) || {};

  if (!users[email]) {
    users[email] = {
      id: generateId(),
      email,
      name: 'Google User',
      provider: 'google',
      tier: 'free',
      createdAt: Date.now(),
    };
    save(USERS_KEY, users);
  }

  const user = normalizeUser(users[email]);
  return persistSession(user);
}

/**
 * Sign in with Apple (simulated).
 */
export async function signInWithApple() {
  await delay(800);

  const email = 'user@icloud.com';
  const users = load(USERS_KEY) || {};

  if (!users[email]) {
    users[email] = {
      id: generateId(),
      email,
      name: 'Apple User',
      provider: 'apple',
      tier: 'free',
      createdAt: Date.now(),
    };
    save(USERS_KEY, users);
  }

  const user = normalizeUser(users[email]);
  return persistSession(user);
}

/**
 * Sign out.
 */
export function signOut() {
  remove(AUTH_KEY);
  notifyListeners(null);
}

/**
 * Reset password (simulated).
 */
export async function resetPassword(email) {
  await delay(700);

  const users = load(USERS_KEY) || {};
  if (!users[email]) {
    throw new Error('No account found with this email.');
  }

  // In production, send a password reset email.
  return { message: 'Password reset link sent to your email.' };
}

/**
 * Update password.
 */
export async function updatePassword(email, newPassword) {
  await delay(400);

  const users = load(USERS_KEY) || {};
  if (!users[email]) throw new Error('User not found.');

  users[email].passwordHash = simpleHash(newPassword);
  save(USERS_KEY, users);
}

/**
 * Delete account.
 */
export async function deleteAccount() {
  const session = getSession();
  if (!session) return;

  const users = load(USERS_KEY) || {};
  delete users[session.user.email];
  save(USERS_KEY, users);
  signOut();
}

// ─── Auth State Listener ─────────────────

const authListeners = new Set();

export function onAuthStateChange(fn) {
  authListeners.add(fn);
  // Immediately call with current state
  fn(getSession());
  return () => authListeners.delete(fn);
}

function notifyListeners(session) {
  authListeners.forEach(fn => fn(session));
}

// ─── Helpers ─────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateId() {
  return 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function simpleHash(str) {
  // Simple hash for demo — NOT secure. Use bcrypt in production.
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

function normalizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    tier: user.tier || 'free',
    provider: user.provider || 'email'
  };
}

function persistSession(user) {
  const session = { user, isAuthenticated: true, tier: user.tier, createdAt: Date.now() };
  save(AUTH_KEY, session);
  notifyListeners(session);
  return session;
}

// Ensure dev test users exist in local development only.
export function initializeTestUser() {
  if (!isDevAuthEnabled()) return;
  const users = load(USERS_KEY) || {};

  let changed = false;
  getDevTestUsers().forEach(u => {
    if (!users[u.email]) {
      users[u.email] = {
        id: generateId(),
        email: u.email,
        name: u.name,
        tier: u.tier,
        createdAt: Date.now(),
        passwordHash: simpleHash(DEV_TEST_PASSWORD),
        // Add sample history for dashboard
        history: [
          { 
            id: 'h1', 
            title: 'Job Application - Senior Dev', 
            url: 'demo://job-application', 
            timestamp: Date.now() - 86400000, 
            status: 'completed',
            provider: 'Google Forms'
          },
          { 
            id: 'h2', 
            title: 'Event Survey 2024', 
            url: 'demo://customer-feedback', 
            timestamp: Date.now() - 172800000, 
            status: 'completed',
            provider: 'Demo'
          }
        ]
      };
      changed = true;
    }
  });

  if (changed) save(USERS_KEY, users);
}
initializeTestUser();

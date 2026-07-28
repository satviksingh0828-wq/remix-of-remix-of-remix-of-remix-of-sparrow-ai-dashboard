/**
 * login-rate-limit.ts
 *
 * Progressive lockout policy:
 *   • 3 failed attempts  → locked for  5 minutes
 *   • 4 failed attempts  → locked for 10 minutes
 *   • 5+ failed attempts → locked for 15 minutes
 *
 * State is stored in encrypted localStorage so lockouts
 * survive browser refresh but reset when cleared.
 */

import { secureStorage } from "./storage";

const STORAGE_KEY = "tms.login.rl.v1";

interface RateLimitRecord {
  attempts: number;
  lockedUntil: number; // epoch ms — 0 = not locked
}

type RateLimitState = Record<string, RateLimitRecord>;

function load(): RateLimitState {
  try {
    const raw = secureStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as RateLimitState;
  } catch {
    return {};
  }
}

function save(state: RateLimitState): void {
  secureStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function lockoutMs(attempts: number): number {
  if (attempts >= 5) return 15 * 60 * 1000;
  if (attempts >= 4) return 10 * 60 * 1000;
  if (attempts >= 3) return 5 * 60 * 1000;
  return 0;
}

/** Returns remaining lockout milliseconds (0 = not locked). */
export function getLockoutRemaining(username: string): number {
  const state = load();
  const rec = state[username.toLowerCase()];
  if (!rec) return 0;
  const remaining = rec.lockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

/** Call on every failed login. Returns new lockout duration in ms (0 = not yet locked). */
export function recordFailedAttempt(username: string): number {
  const key = username.toLowerCase();
  const state = load();
  const rec = state[key] ?? { attempts: 0, lockedUntil: 0 };

  // If previous lockout expired, reset counter
  if (rec.lockedUntil > 0 && rec.lockedUntil <= Date.now()) {
    rec.attempts = 0;
    rec.lockedUntil = 0;
  }

  rec.attempts += 1;
  const ms = lockoutMs(rec.attempts);
  rec.lockedUntil = ms > 0 ? Date.now() + ms : 0;

  state[key] = rec;
  save(state);
  return ms;
}

/** Call on successful login to clear rate limit state for this user. */
export function clearRateLimit(username: string): void {
  const state = load();
  delete state[username.toLowerCase()];
  save(state);
}

/** Human-readable remaining lockout string, e.g. "4 min 23 sec". */
export function lockoutLabel(remainingMs: number): string {
  const totalSec = Math.ceil(remainingMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins > 0 && secs > 0) return `${mins} min ${secs} sec`;
  if (mins > 0) return `${mins} min`;
  return `${secs} sec`;
}

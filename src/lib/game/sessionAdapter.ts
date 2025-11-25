/**
 * Thin adapter between the emotion game and the new tracking SessionManager.
 *
 * Goals:
 * - Keep EmotionGame.tsx free of direct SessionManager calls
 * - Allow incremental enrichment of session data without touching the game loop
 * - Provide a small, well-documented surface for other game-like modules to reuse
 */

import { sessionManager } from '@/lib/tracking/sessionManager';
import type { UUID, EmotionLevel } from '@/lib/storage/types';

/**
 * Start a tracking session corresponding to an emotion game run.
 *
 * @param studentId - The current student id (string). Falls back to 'anonymous' if empty.
 * @param mode - Optional game mode label (e.g. 'classic', 'time_attack', 'mirror', 'confidence')
 * @returns The created session id, or null if startup fails
 */
export function startEmotionGameSession(studentId: string | null | undefined, mode?: string): UUID | null {
  const trimmed = (studentId ?? '').trim();
  const sid: UUID = (trimmed.length > 0 ? trimmed : 'anonymous') as UUID;
  try {
    // For now we rely on default SessionManager config; we can tune this per mode later.
    const session = sessionManager.startSession(sid, {});
    // Tagging is handled at analytics/reporting layer; the session itself remains generic.
    return session.id;
  } catch {
    // If anything goes wrong we do not want the game UI to break.
    return null;
  }
}

interface RoundSuccessSummary {
  /**
   * Game round target label, e.g. 'happy', 'neutral'
   */
  target: string;
  /**
   * Approximate time to success in milliseconds
   */
  timeMs: number;
  /**
   * Whether the player used a hint for this round
   */
  usedHint: boolean;
}

/**
 * Append a lightweight emotion entry representing a successful round.
 *
 * NOTE: This intentionally stores a coarse-grained view of the round:
 * - label: target expression name
 * - intensity: derived from performance (fast rounds → higher intensity)
 * - durationSeconds: based on time to success
 */
export function recordEmotionRoundSuccess(
  sessionId: UUID | null | undefined,
  summary: RoundSuccessSummary,
): void {
  if (!sessionId) return;
  try {
    const { target, timeMs, usedHint } = summary;
    // Map time to an approximate 1–5 "intensity" scale where faster = more intense.
    let intensity: EmotionLevel = 3;
    if (timeMs < 1500) intensity = 5;
    else if (timeMs < 3000) intensity = 4;
    else if (timeMs > 7000) intensity = 2;
    if (usedHint && intensity > 1) {
      intensity = (intensity - 1) as EmotionLevel;
    }
    sessionManager.addEmotion(sessionId, {
      label: target,
      intensity,
      durationSeconds: Math.max(1, Math.round(timeMs / 1000)),
      context: 'emotion-game',
    });
  } catch {
    // Swallow errors to keep gameplay smooth
  }
}

/**
 * Mark the current emotion game session as ended in the tracking system.
 *
 * @param sessionId - The active tracking session id
 * @param save - Whether to keep the session as 'completed' (default) or discard
 */
export function endEmotionGameSession(
  sessionId: UUID | null | undefined,
  { save = true }: { save?: boolean } = {},
): void {
  if (!sessionId) return;
  try {
    sessionManager.endSession(sessionId, { save });
  } catch {
    // Ignore errors; this should never block the UI
  }
}





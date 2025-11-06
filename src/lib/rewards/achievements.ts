import { loadProgress, saveProgress, StickerId } from '@/lib/progress/progress-store';

export function evaluateAchievements(): StickerId[] {
  const map = loadProgress();
  const days = Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  if (days.length === 0) return [];
  const today = days[0];
  const unlocked: StickerId[] = [];
  if (today.neutralHolds >= 3 && !today.stickers.includes('hold-master')) {
    today.stickers.push('hold-master');
    unlocked.push('hold-master');
  }
  if (today.nameItCorrect >= 5 && !today.stickers.includes('name-hero')) {
    today.stickers.push('name-hero');
    unlocked.push('name-hero');
  }
  if (today.streak >= 10 && !today.stickers.includes('streak-star')) {
    today.stickers.push('streak-star');
    unlocked.push('streak-star');
  }
  if (unlocked.length > 0) saveProgress(map);
  return unlocked;
}







import { describe, it, expect } from 'vitest';
import { sanitizePlainNorwegian, type AllowedContexts } from '@/lib/evidence/evidenceBuilder';

describe('sanitizePlainNorwegian', () => {
  const allowed: AllowedContexts = {
    places: ['kantine'],
    activities: ['group-work'],
    triggers: ['sosial interaksjon']
  };

  it('removes markdown and collapses whitespace', () => {
    const input = '**Hei**  \n\nDette  er  _tekst_';
    const out = sanitizePlainNorwegian(input, allowed);
    expect(out).toBe('Hei Dette er tekst');
  });

  it('replaces forbidden place tokens not in allowed list', () => {
    const input = 'Møte i klasserom i dag';
    const out = sanitizePlainNorwegian(input, allowed);
    expect(out.toLowerCase()).toContain('ikke logget sted');
    expect(out.toLowerCase()).not.toContain('klasserom');
  });

  it('keeps allowed places', () => {
    const input = 'Lunsj i kantine';
    const out = sanitizePlainNorwegian(input, allowed);
    expect(out).toContain('kantine');
  });
});


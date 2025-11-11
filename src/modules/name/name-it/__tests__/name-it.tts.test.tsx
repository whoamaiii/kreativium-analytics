import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NameIt from '@/modules/name/name-it/NameIt';

beforeEach(() => {
  vi.stubGlobal('speechSynthesis', {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => []),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as any);
});

describe('NameIt', () => {
  it('renders and can play prompt', () => {
    render(<NameIt />);
    const btn = screen.getByRole('button', { name: /hør ordet|hear the word/i });
    fireEvent.click(btn);
    expect((window as any).speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });
});

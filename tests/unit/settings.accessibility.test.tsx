import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Settings from '@/pages/Settings';

describe('Settings accessibility toggles', () => {
  it('persists quiet rewards', () => {
    render(<Settings />);
    const label = /quiet rewards|stille belønninger/i;
    const row = screen.getByText(label).closest('div')?.parentElement as HTMLElement;
    const toggle = row.querySelector('button[role="switch"]') as HTMLButtonElement;
    fireEvent.click(toggle);
    expect(localStorage.getItem('emotion.quietRewards')).toBe('1');
  });
});

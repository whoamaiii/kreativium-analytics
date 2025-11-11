import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { EntryDetailsDrawer } from '@/components/analytics-panels/EntryDetailsDrawer';
import type { SourceItem } from '@/types/analytics';

const sampleSource: SourceItem = {
  id: 'tracking:abc',
  timestamp: '2024-01-01T09:15:00.000Z',
  activity: 'Presentasjon',
  place: 'Klasserom',
  socialContext: 'Liten gruppe',
  note: 'Kort presentasjon foran klassen.',
  emotions: [{ id: 'emotion:1', emotion: 'Spent', intensity: 4, notes: 'Økte skuldre' }],
  sensory: [{ id: 'sensory:1', type: 'Lyd', response: 'Dekket ørene', intensity: 3 }],
  environment: { noiseLevel: 3, lighting: 'Sterkt lys', timeOfDay: 'morning' },
};

afterEach(() => {
  // Clean up clipboard mock between tests
  // @ts-expect-error allow delete in test env
  delete navigator.clipboard;
});

describe('EntryDetailsDrawer', () => {
  it('shows source details and copies as text', async () => {
    const handleOpenChange = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<EntryDetailsDrawer source={sampleSource} open onOpenChange={handleOpenChange} />);

    expect(screen.getByRole('heading', { name: /Presentasjon \/ Klasserom/i })).toBeInTheDocument();

    const noteSection = screen.getByText(/Notat/i).closest('section');
    expect(noteSection).toBeTruthy();
    expect(
      within(noteSection as HTMLElement).getByText(/Kort presentasjon foran klassen/i),
    ).toBeInTheDocument();

    const envSection = screen.getByText(/Miljødetaljer/i).closest('section');
    expect(envSection).toBeTruthy();
    expect(within(envSection as HTMLElement).getByText(/Støynivå/i)).toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: /kopier kilde som tekst/i });
    await userEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it('renders a placeholder message when no source is provided', () => {
    render(<EntryDetailsDrawer source={null} open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /ingen kilde valgt/i })).toBeInTheDocument();
  });
});

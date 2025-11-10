import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExplanationChat } from '@/components/analytics-panels/ExplanationChat';

describe('ExplanationChat citations and drawer', () => {
  const sourcesRich = [
    {
      id: 'tracking:1',
      timestamp: new Date('2024-01-02T10:17:00Z').toISOString(),
      activity: 'Gruppeoppgave',
      place: 'klasserom',
      note: 'samarbeid med medelev',
      emotions: [{ id: 'e1', emotion: 'stress', intensity: 3 }],
      sensory: [{ id: 's1', type: 'lys', response: 'blunker', intensity: 2 }],
    },
    {
      id: 'tracking:2',
      timestamp: new Date('2024-01-03T11:05:00Z').toISOString(),
      activity: 'Friminutt',
      place: 'kantine',
      note: 'uro i køen',
      emotions: [{ id: 'e2', emotion: 'frustrasjon', intensity: 4 }],
      sensory: [{ id: 's2', type: 'lyd', response: 'dekker ørene', intensity: 3 }],
    },
  ];

  it('renders sources and opens drawer when clicking a source item', async () => {
    render(
      <ExplanationChat
        aiEnabled={false}
        systemPrompt={''}
        initialMessages={[]}
        sourcesRich={sourcesRich}
      />,
    );

    // Kilder list is visible
    expect(screen.getByText(/Kilder fra data \(2\)/)).toBeInTheDocument();

    // Click first source button (by aria-label)
    const btn = screen.getByRole('button', { name: /Åpne detaljer for Gruppeoppgave/ });
    fireEvent.click(btn);

    // Drawer opens with title
    expect(await screen.findByText('Detaljer')).toBeInTheDocument();
  });

  it('highlights and maps [S2] citation to clickable button', async () => {
    render(
      <ExplanationChat
        aiEnabled={false}
        systemPrompt={''}
        initialMessages={[{ role: 'assistant', content: 'Eksempel viser klar sammenheng [S2].' }]}
        sourcesRich={sourcesRich}
      />,
    );

    // Henvisninger section shows S1 and S2
    expect(screen.getByText('Henvisninger')).toBeInTheDocument();
    const s2 = screen.getByRole('button', { name: /henvisning S2/i });
    expect(s2).toBeInTheDocument();

    // Click S2 to open details
    fireEvent.click(s2);
    expect(await screen.findByText('Detaljer')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ExplanationChat } from '@/components/analytics-panels/ExplanationChat';

vi.mock('@/lib/ai/openrouterClient', () => ({
  openRouterClient: {
    chat: vi.fn(async () => ({
      content: '**Dette** er et test-svar',
      raw: { model: 'mock' },
      usage: {},
      metrics: { durationMs: 1, attempts: 1 },
    })),
  },
}));

describe('ExplanationChat', () => {
  it('disables composer when AI is disabled', async () => {
    render(<ExplanationChat aiEnabled={false} systemPrompt="sys" />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('sends a message and shows assistant reply', async () => {
    render(<ExplanationChat aiEnabled={true} systemPrompt="sys" />);
    const input = screen.getByLabelText(/forklaringen/i);
    await userEvent.type(input, 'Hva betyr dette?{enter}');
    // assistant reply appears without markdown asterisks
    expect(await screen.findByText(/^Dette er et test-svar$/i)).toBeInTheDocument();
  });
});

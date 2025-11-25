import React from 'react';
import { render, screen } from '@testing-library/react';
import { TodayProgressStrip } from '@/components/game/TodayProgressStrip';

describe('TodayProgressStrip', () => {
  it('shows empty state when there is no progress', () => {
    render(
      <TodayProgressStrip
        neutralHolds={0}
        correctChoices={0}
        nameItCorrect={0}
        streak={0}
      />,
    );

    expect(
      screen.getByText(/Ingen registrert fremgang ennå\./i),
    ).toBeInTheDocument();
  });

  it('updates displayed values when progress props change', () => {
    const { rerender } = render(
      <TodayProgressStrip
        neutralHolds={1}
        correctChoices={2}
        nameItCorrect={3}
        streak={4}
      />,
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();

    rerender(
      <TodayProgressStrip
        neutralHolds={5}
        correctChoices={6}
        nameItCorrect={7}
        streak={8}
      />,
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });
});





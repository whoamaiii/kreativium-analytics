import { render, screen } from '@testing-library/react';
import { XPProgressBar } from '@/components/game/XPProgressBar';

describe('XPProgressBar', () => {
  it('sets correct aria values', () => {
    render(
      <XPProgressBar progress={0.5} xp={50} xpToNext={100} level={3} streak={2} pendingDelta={0} />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });
});

import { describe, it, beforeEach, expect } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TrackStudent from '../TrackStudent';
import { storageService } from '@/lib/storage/storageService';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    tTracking: (key: string) => key,
    tCommon: (key: string) => key,
  }),
}));

describe('TrackStudent', () => {
  beforeEach(() => {
    storageService.clearAll();
  });

  it('renders without crashing for an existing student', async () => {
    const student = storageService.upsertStudent({ name: 'Test Student' });

    render(
      <MemoryRouter initialEntries={[`/track/${student.id}`]}>
        <Routes>
          <Route path="/track/:studentId" element={<TrackStudent />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/session.title/i)).toBeInTheDocument();
    });
  });
});

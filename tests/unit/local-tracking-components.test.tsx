import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmotionTracker } from '@/components/EmotionTracker';
import { SensoryTracker } from '@/components/SensoryTracker';
import { EnvironmentalTracker } from '@/components/EnvironmentalTracker';

describe('Local-first tracking components', () => {
  it('emits normalized emotions for EmotionTracker', async () => {
    const user = userEvent.setup();
    const onEmotionAdd = vi.fn();
    render(<EmotionTracker onEmotionAdd={onEmotionAdd} />);

    await user.click(screen.getByRole('button', { name: /Happy/i }));
    await user.click(screen.getByRole('button', { name: /joyful/i }));
    await user.click(screen.getByRole('button', { name: /Intensity level 4/i }));

    const durationInput = screen.getByLabelText(/Duration in minutes/i);
    await user.clear(durationInput);
    await user.type(durationInput, '12');

    const triggerInput = screen.getByLabelText(/Legg til ny utløser/i);
    await user.type(triggerInput, 'sirene{enter}');
    await user.type(triggerInput, 'lys{enter}');

    await user.type(screen.getByPlaceholderText(/observasjoner/i), 'Felt note');
    await user.click(screen.getByRole('button', { name: /Gradual/i }));
    await user.click(screen.getByRole('button', { name: /Add Emotion/i }));

    expect(onEmotionAdd).toHaveBeenCalledTimes(1);
    const payload = onEmotionAdd.mock.calls[0][0];
    expect(payload).toMatchObject({
      label: 'joyful',
      intensity: 4,
      durationSeconds: 720,
      trigger: 'sirene',
    });
    expect(payload.context).toContain('Felt note');
    expect(payload.context).toContain('Øvrige triggere: lys');
    expect(payload.context).toContain('Utvikling: gradual');
  });

  it('emits normalized sensory entries for SensoryTracker', async () => {
    const user = userEvent.setup();
    const onSensoryAdd = vi.fn();
    render(<SensoryTracker onSensoryAdd={onSensoryAdd} />);

    await user.click(screen.getByRole('button', { name: /Visual/i }));
    await user.click(screen.getByRole('button', { name: /Seeking/i }));
    await user.click(screen.getByRole('button', { name: /Intensity level 5/i }));
    await user.click(screen.getByRole('button', { name: /Select body location: Hands/i }));

    const strategyInput = screen.getByLabelText(/Legg til mestringsstrategi/i);
    await user.type(strategyInput, 'Squeeze ball{enter}');
    await user.click(screen.getByText('+ Deep breathing'));

    await user.type(screen.getByLabelText(/Beskriv miljøet/i), 'Gym hall');
    await user.type(
      screen.getByPlaceholderText(/sensoriske responsen/i),
      'Flashing lights near stage',
    );

    await user.click(screen.getByRole('button', { name: /Add Sensory Input/i }));

    expect(onSensoryAdd).toHaveBeenCalledTimes(1);
    const payload = onSensoryAdd.mock.calls[0][0];
    expect(payload).toMatchObject({
      sense: 'sight',
      response: 'seeking',
      intensity: 5,
    });
    expect(payload.description).toContain('Flashing lights near stage');
    expect(payload.description).toContain('Miljø: Gym hall');
    expect(payload.description).toContain('Lokasjon: Hands');
    expect(payload.description).toContain('Strategier: Squeeze ball, Deep breathing');
  });

  it('emits normalized environmental entries for EnvironmentalTracker', async () => {
    const user = userEvent.setup();
    const onEnvironmentalAdd = vi.fn();
    render(<EnvironmentalTracker onEnvironmentalAdd={onEnvironmentalAdd} />);

    const comboBoxes = screen.getAllByRole('combobox');
    const [lightingSelect, crowdSelect, weatherSelect, timeSelect] = comboBoxes;

    await user.click(lightingSelect);
    await user.click(await screen.findByRole('option', { name: /Bright/i }));

    await user.click(crowdSelect);
    await user.click(await screen.findByRole('option', { name: /High/i }));

    await user.click(weatherSelect);
    await user.click(await screen.findByRole('option', { name: /Rainy/i }));

    await user.click(timeSelect);
    await user.click(await screen.findByRole('option', { name: /Afternoon/i }));

    const notesArea = screen.getByPlaceholderText(/environmental factors/i);
    await user.type(notesArea, 'Rolig lesesone');

    const specialEventInput = screen.getByPlaceholderText(/special events/i);
    await user.type(specialEventInput, 'Assembly{enter}');

    await user.click(screen.getByRole('button', { name: /Save Environmental Data/i }));

    expect(onEnvironmentalAdd).toHaveBeenCalledTimes(1);
    const payload = onEnvironmentalAdd.mock.calls[0][0];
    expect(payload).toMatchObject({
      temperatureC: 22,
      lighting: 'bright',
      noiseLevel: 3,
      socialContext: 'high',
    });
    expect(payload.notes).toContain('Rolig lesesone');
    expect(payload.notes).toContain('Vær: rainy');
    expect(payload.notes).toContain('Tid: afternoon');
    expect(payload.notes).toContain('Hendelser: Assembly');
  });
});

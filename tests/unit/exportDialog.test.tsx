import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportDialog } from '@/components/ExportDialog';
import analyticsEn from '@/locales/en/analytics.json';

const escapeRegExp = (value: string): string => value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
const leadingLabel = (label: string): RegExp => new RegExp(`^${escapeRegExp(label)}`, 'i');
const leadingText = (value: string): RegExp => new RegExp(`^${escapeRegExp(value)}`, 'i');

describe('ExportDialog', () => {
  it('allows selecting options and confirms', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ExportDialog open={true} onOpenChange={() => {}} onConfirm={onConfirm} defaultFormat="pdf" />);

    const copy = analyticsEn['export'];

    // open selects and pick values
    await user.click(screen.getByLabelText(leadingLabel(copy.options.format)));
    await user.click(await screen.findByRole('option', { name: 'PDF' }));

    await user.click(screen.getByLabelText(leadingLabel(copy.options.template)));
    await user.click(await screen.findByRole('option', { name: copy.templates.detailed }));

    await user.click(screen.getByLabelText(leadingLabel(copy.options.quality)));
    await user.click(await screen.findByRole('option', { name: copy.quality.high }));

    await user.click(screen.getByLabelText(leadingLabel(copy.options.colorScheme)));
    await user.click(await screen.findByRole('option', { name: copy.schemes.default }));

    // toggle include raw data
    await user.click(screen.getByLabelText(leadingLabel(copy.options.includeRawData)));

    await user.click(screen.getByRole('button', { name: leadingText(copy.button) }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

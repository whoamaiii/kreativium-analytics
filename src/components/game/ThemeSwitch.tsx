import React from 'react';

interface ThemeSwitchProps {
  themeId: 'regnbueland' | 'rom';
  onChange: (id: 'regnbueland' | 'rom') => void;
}

export function ThemeSwitch({ themeId, onChange }: ThemeSwitchProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
      <button
        className={`px-3 py-1.5 rounded-lg text-sm ${themeId === 'regnbueland' ? 'bg-white/15 text-white' : 'text-white/80 hover:text-white'}`}
        onClick={() => onChange('regnbueland')}
        aria-pressed={themeId === 'regnbueland'}
      >Regnbue</button>
      <button
        className={`px-3 py-1.5 rounded-lg text-sm ${themeId === 'rom' ? 'bg-white/15 text-white' : 'text-white/80 hover:text-white'}`}
        onClick={() => onChange('rom')}
        aria-pressed={themeId === 'rom'}
      >Rom</button>
    </div>
  );
}

export default ThemeSwitch;







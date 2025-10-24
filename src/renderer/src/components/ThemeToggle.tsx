import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export function ThemeToggle() {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setSaving(true);
    await window.cleanApi.settings.update({ theme: next });
    setSaving(false);
  };

  return (
    <button
      className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-200"
      onClick={toggle}
      aria-label="Theme umschalten"
    >
      {saving ? '…' : theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}

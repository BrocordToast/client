import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export function VersionPicker() {
  const versions = useAppStore((state) => state.versions);
  const selected = useAppStore((state) => state.selectedVersionId);
  const setSelected = useAppStore((state) => state.setSelectedVersionId);
  const [showSnapshots, setShowSnapshots] = useState(false);

  const filtered = useMemo(
    () => versions.filter((version) => (showSnapshots ? true : version.type === 'release')).slice(0, 50),
    [versions, showSnapshots]
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Version auswählen</h2>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-600 bg-slate-900"
            checked={showSnapshots}
            onChange={(event) => setShowSnapshots(event.target.checked)}
          />
          Snapshots anzeigen
        </label>
      </div>
      <div className="h-64 overflow-y-auto rounded border border-slate-700 bg-slate-900/70">
        <ul>
          {filtered.map((version) => (
            <li key={version.id}>
              <button
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-slate-700/60 ${
                  selected === version.id ? 'bg-slate-700/70 text-white' : 'text-slate-300'
                }`}
                onClick={() => setSelected(version.id)}
              >
                <span>{version.id}</span>
                <span className="text-xs uppercase text-slate-400">{version.type}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

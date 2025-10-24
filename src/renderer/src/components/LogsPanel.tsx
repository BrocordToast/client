import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export function LogsPanel() {
  const logs = useAppStore((state) => state.logs);
  const resetLogs = useAppStore((state) => state.resetLogs);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/60">
      <button
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold text-slate-200"
        onClick={() => setExpanded((prev) => !prev)}
      >
        Log anzeigen
        <span className="text-xs text-slate-400">{expanded ? '▼' : '▲'}</span>
      </button>
      {expanded && (
        <div className="h-48 overflow-y-auto border-t border-slate-800 bg-black/70 font-mono text-xs text-slate-300">
          <pre className="whitespace-pre-wrap p-4">
            {logs.length > 0 ? logs.join('\n') : 'Keine Einträge vorhanden.'}
          </pre>
        </div>
      )}
      {expanded && (
        <div className="flex justify-end border-t border-slate-800 px-4 py-2">
          <button className="rounded border border-slate-600 px-3 py-1 text-xs" onClick={resetLogs}>
            Log leeren
          </button>
        </div>
      )}
    </div>
  );
}

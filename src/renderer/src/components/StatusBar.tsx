import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';

export function StatusBar() {
  const progress = useAppStore((state) => state.progress);
  const launching = useAppStore((state) => state.launching);

  const percentage = useMemo(() => {
    if (!progress?.total) return null;
    return Math.min(100, Math.round((progress.downloaded / progress.total) * 100));
  }, [progress?.downloaded, progress?.total]);

  return (
    <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900 px-4 py-2 text-xs text-slate-300">
      <span>{launching ? 'Download & Start läuft…' : 'Bereit'}</span>
      {progress && (
        <div className="flex items-center gap-3">
          <span>{progress.taskId}</span>
          {percentage !== null ? <span>{percentage}%</span> : <span>{Math.round(progress.downloaded / 1024)} KB</span>}
        </div>
      )}
    </div>
  );
}

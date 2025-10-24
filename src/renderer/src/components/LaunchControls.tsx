import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export function LaunchControls() {
  const account = useAppStore((state) => state.account);
  const versions = useAppStore((state) => state.versions);
  const selectedVersionId = useAppStore((state) => state.selectedVersionId);
  const instances = useAppStore((state) => state.instances);
  const currentInstanceId = useAppStore((state) => state.currentInstanceId);
  const setLaunching = useAppStore((state) => state.setLaunching);
  const appendLog = useAppStore((state) => state.appendLog);
  const launching = useAppStore((state) => state.launching);
  const [error, setError] = useState<string | null>(null);

  const currentInstance = instances.find((instance) => instance.id === currentInstanceId);
  const selectedVersion = versions.find((version) => version.id === selectedVersionId);

  const canLaunch = Boolean(account && currentInstance && selectedVersion && currentInstance.javaPath);

  const launch = async () => {
    if (!canLaunch || !account || !currentInstance || !selectedVersion) {
      setError('Bitte alle Felder ausfüllen und anmelden.');
      return;
    }

    setError(null);
    setLaunching(true);
    appendLog(`Starte ${selectedVersion.id} mit ${account.gamertag}…`);

    try {
      await window.cleanApi.launcher.launch({
        instance: currentInstance,
        javaPath: currentInstance.javaPath,
        versionId: selectedVersion.id,
        manifestUrl: selectedVersion.url
      });
    } catch (launchError) {
      setError((launchError as Error).message);
      setLaunching(false);
    }
  };

  const stop = async () => {
    await window.cleanApi.launcher.stop();
    setLaunching(false);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Start</h2>
        <button
          className={`rounded px-4 py-2 text-sm font-semibold text-white ${canLaunch ? 'bg-primary' : 'bg-slate-600'}`}
          onClick={launching ? stop : launch}
          disabled={!canLaunch && !launching}
        >
          {launching ? 'Stop' : 'Launch'}
        </button>
      </div>
      {!account && <p className="text-xs text-red-400">Bitte zuerst mit deinem Microsoft-Konto anmelden.</p>}
      {account && !currentInstance?.javaPath && (
        <p className="text-xs text-red-400">Java-Laufzeit wurde nicht gefunden. Bitte Pfad angeben.</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

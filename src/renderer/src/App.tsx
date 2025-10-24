import { useEffect } from 'react';
import { AuthPanel } from './components/AuthPanel';
import { VersionPicker } from './components/VersionPicker';
import { InstanceSettings } from './components/InstanceSettings';
import { LaunchControls } from './components/LaunchControls';
import { LogsPanel } from './components/LogsPanel';
import { StatusBar } from './components/StatusBar';
import { useAppStore } from './store/useAppStore';
import { ThemeToggle } from './components/ThemeToggle';

function useInitialData() {
  const setAccount = useAppStore((state) => state.setAccount);
  const setVersions = useAppStore((state) => state.setVersions);
  const setSelectedVersionId = useAppStore((state) => state.setSelectedVersionId);
  const setInstances = useAppStore((state) => state.setInstances);
  const setCurrentInstanceId = useAppStore((state) => state.setCurrentInstanceId);
  const setProgress = useAppStore((state) => state.setProgress);
  const setLaunching = useAppStore((state) => state.setLaunching);
  const appendLog = useAppStore((state) => state.appendLog);
  const setTheme = useAppStore((state) => state.setTheme);

  useEffect(() => {
    const load = async () => {
      const [account, manifest, instances, settings] = await Promise.all([
        window.cleanApi.auth.getAccount(),
        window.cleanApi.versions.list(),
        window.cleanApi.instances.list(),
        window.cleanApi.settings.get()
      ]);
      if (account) setAccount(account);
      if (settings) setTheme(settings.theme);

      const versionSummaries = manifest.versions.map((version: any) => ({
        id: version.id,
        type: version.type,
        url: version.url,
        releaseTime: version.releaseTime
      }));
      setVersions(versionSummaries);
      setSelectedVersionId(manifest.latest.release);

      if (instances.length === 0) {
        const defaultInstance = {
          id: crypto.randomUUID(),
          name: 'Standard',
          version: manifest.latest.release,
          javaPath: '',
          minRam: 2048,
          maxRam: 4096,
          resolution: { width: 1280, height: 720, fullscreen: false },
          gameDir: '',
          modsDir: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        let list = await window.cleanApi.instances.upsert(defaultInstance);
        setInstances(list);
        setCurrentInstanceId(defaultInstance.id);
        const detected = await window.cleanApi.java.detect();
        if (detected) {
          list = await window.cleanApi.instances.upsert({ ...defaultInstance, javaPath: detected.path });
          setInstances(list);
        }
      } else {
        setInstances(instances);
        setCurrentInstanceId(instances[0].id);
        if (!instances[0].javaPath) {
          const detected = await window.cleanApi.java.detect();
          if (detected) {
            const updated = await window.cleanApi.instances.upsert({ ...instances[0], javaPath: detected.path });
            setInstances(updated);
          }
        }
      }
    };

    void load();

    window.cleanApi.launcher.onProgress((progress) => setProgress(progress));
    window.cleanApi.launcher.onLog((line) => appendLog(line));
    window.cleanApi.launcher.onExit((payload) => {
      setLaunching(false);
      appendLog(`Prozess beendet (Code ${payload.code ?? 'unbekannt'})`);
      setProgress(null);
    });
  }, [appendLog, setAccount, setCurrentInstanceId, setInstances, setLaunching, setProgress, setSelectedVersionId, setTheme, setVersions]);
}

export function App() {
  useInitialData();
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className={`flex min-h-screen flex-col ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">CleanLauncher</h1>
            <p className="text-xs text-slate-400">Legal. Sicher. Microsoft-authentifiziert.</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Version {import.meta.env.MODE === 'development' ? 'Dev' : '0.1.0'}</span>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1 px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6">
            <AuthPanel />
            <LaunchControls />
          </div>
          <div className="lg:col-span-2 flex flex-col gap-6">
            <VersionPicker />
            <InstanceSettings />
            <LogsPanel />
          </div>
        </div>
      </main>
      <StatusBar />
    </div>
  );
}

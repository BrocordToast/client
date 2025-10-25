import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export function SetupWizard() {
  const instances = useAppStore((state) => state.instances);
  const setInstances = useAppStore((state) => state.setInstances);
  const versions = useAppStore((state) => state.versions);
  const selectedVersionId = useAppStore((state) => state.selectedVersionId);
  const setSelectedVersionId = useAppStore((state) => state.setSelectedVersionId);
  const setShowSetupWizard = useAppStore((state) => state.setShowSetupWizard);
  const setOnboardingComplete = useAppStore((state) => state.setOnboardingComplete);

  const instance = useMemo(() => instances[0], [instances]);

  const [name, setName] = useState('');
  const [javaPath, setJavaPath] = useState('');
  const [minRam, setMinRam] = useState(2048);
  const [maxRam, setMaxRam] = useState(4096);
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);
  const [fullscreen, setFullscreen] = useState(false);
  const [gameDir, setGameDir] = useState('');
  const [modsDir, setModsDir] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instance) return;
    setName(instance.name);
    setJavaPath(instance.javaPath ?? '');
    setMinRam(instance.minRam);
    setMaxRam(instance.maxRam);
    setWidth(instance.resolution.width);
    setHeight(instance.resolution.height);
    setFullscreen(instance.resolution.fullscreen);
    setGameDir(instance.gameDir);
    setModsDir(instance.modsDir);
  }, [instance]);

  const onDetectJava = async () => {
    const detected = await window.cleanApi.java.detect();
    if (detected) {
      setJavaPath(detected.path);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!instance || !selectedVersionId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...instance,
        name,
        version: selectedVersionId,
        javaPath,
        minRam,
        maxRam,
        resolution: { width, height, fullscreen },
        gameDir,
        modsDir
      };
      const updated = await window.cleanApi.instances.upsert(payload);
      setInstances(updated);
      await window.cleanApi.settings.update({ onboardingComplete: true });
      setOnboardingComplete(true);
      setShowSetupWizard(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 px-6">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-8 text-slate-100 shadow-xl">
        <h2 className="text-2xl font-semibold">Erste Einrichtung</h2>
        <p className="mt-2 text-sm text-slate-300">
          Konfiguriere deine erste Instanz direkt hier in der Anwendung. Alle Angaben können später im Hauptfenster geändert werden.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              <span className="mb-1 font-medium">Instanz-Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1 font-medium">Minecraft-Version</span>
              <select
                value={selectedVersionId ?? ''}
                onChange={(event) => setSelectedVersionId(event.target.value)}
                className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
                required
              >
                <option value="" disabled>
                  Version auswählen
                </option>
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.id} ({version.type})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-[3fr,1fr]">
            <label className="flex flex-col text-sm">
              <span className="mb-1 font-medium">Java-Pfad</span>
              <input
                value={javaPath}
                onChange={(event) => setJavaPath(event.target.value)}
                className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
                placeholder="C:\\Program Files\\Java\\bin\\java.exe"
                required
              />
            </label>
            <button
              type="button"
              onClick={onDetectJava}
              className="self-end rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-600"
            >
              Java automatisch suchen
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              <span className="mb-1 font-medium">RAM (Minimum in MB)</span>
              <input
                type="number"
                value={minRam}
                min={512}
                step={256}
                onChange={(event) => setMinRam(Number(event.target.value))}
                className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1 font-medium">RAM (Maximum in MB)</span>
              <input
                type="number"
                value={maxRam}
                min={1024}
                step={256}
                onChange={(event) => setMaxRam(Number(event.target.value))}
                className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <fieldset className="grid gap-4 rounded-lg border border-slate-700 p-4">
            <legend className="px-2 text-sm font-semibold">Auflösung</legend>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex flex-col text-sm">
                <span className="mb-1 font-medium">Breite</span>
                <input
                  type="number"
                  value={width}
                  min={640}
                  onChange={(event) => setWidth(Number(event.target.value))}
                  className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col text-sm">
                <span className="mb-1 font-medium">Höhe</span>
                <input
                  type="number"
                  value={height}
                  min={480}
                  onChange={(event) => setHeight(Number(event.target.value))}
                  className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={fullscreen}
                  onChange={(event) => setFullscreen(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                />
                Vollbild
              </label>
            </div>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              <span className="mb-1 font-medium">Spiele-Ordner</span>
              <input
                value={gameDir}
                onChange={(event) => setGameDir(event.target.value)}
                className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
                placeholder="C:\\Users\\Du\\AppData\\Roaming\\CleanLauncher\\instances\\Standard"
              />
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1 font-medium">Mods-Ordner</span>
              <input
                value={modsDir}
                onChange={(event) => setModsDir(event.target.value)}
                className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
                placeholder="...\\mods"
              />
            </label>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowSetupWizard(false)}
              className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              Später
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? 'Speichern…' : 'Setup abschließen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export function InstanceSettings() {
  const instances = useAppStore((state) => state.instances);
  const currentInstanceId = useAppStore((state) => state.currentInstanceId);
  const setInstances = useAppStore((state) => state.setInstances);
  const setCurrentInstanceId = useAppStore((state) => state.setCurrentInstanceId);
  const selectedVersionId = useAppStore((state) => state.selectedVersionId);
  const selectedInstance = instances.find((instance) => instance.id === currentInstanceId) ?? instances[0];
  const [form, setForm] = useState<typeof selectedInstance>(selectedInstance);

  useEffect(() => {
    setForm(selectedInstance);
  }, [selectedInstance?.id]);

  if (!selectedInstance) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <p className="text-sm text-slate-300">Keine Instanz gefunden. Erstelle eine neue in den Einstellungen.</p>
      </div>
    );
  }

  const update = (updates: Partial<typeof selectedInstance>) => {
    setForm((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const save = async () => {
    if (!form) return;
    const updated = {
      ...form,
      version: selectedVersionId ?? form.version,
      updatedAt: new Date().toISOString()
    };
    const list = await window.cleanApi.instances.upsert(updated);
    setInstances(list);
    setCurrentInstanceId(updated.id);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Instanz</h2>
          <p className="text-xs text-slate-400">Verwalte Spielpfad, Java-Version und Startparameter.</p>
          <p className="text-xs text-slate-500">Aktive Version: {selectedVersionId ?? '–'}</p>
        </div>
        <select
          className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
          value={selectedInstance.id}
          onChange={(event) => setCurrentInstanceId(event.target.value)}
        >
          {instances.map((instance) => (
            <option key={instance.id} value={instance.id}>
              {instance.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-400">Java-Pfad</span>
          <input
            className="rounded border border-slate-600 bg-slate-900 px-2 py-1"
            value={form?.javaPath ?? ''}
            placeholder="/pfad/zur/java"
            onChange={(event) => update({ javaPath: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-400">Spielordner</span>
          <input
            className="rounded border border-slate-600 bg-slate-900 px-2 py-1"
            value={form?.gameDir ?? ''}
            onChange={(event) => update({ gameDir: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-400">Mods-Ordner</span>
          <input
            className="rounded border border-slate-600 bg-slate-900 px-2 py-1"
            value={form?.modsDir ?? ''}
            onChange={(event) => update({ modsDir: event.target.value })}
          />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-400">RAM</span>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <label className="flex items-center gap-2">
              Min
              <input
                type="number"
                min={512}
                max={form?.maxRam ?? 16384}
                value={form?.minRam ?? 1024}
                className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1"
                onChange={(event) => update({ minRam: Number(event.target.value) })}
              />
            </label>
            <label className="flex items-center gap-2">
              Max
              <input
                type="number"
                min={form?.minRam ?? 1024}
                max={32768}
                value={form?.maxRam ?? 4096}
                className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1"
                onChange={(event) => update({ maxRam: Number(event.target.value) })}
              />
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-400">Auflösung</span>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <label className="flex items-center gap-2">
              Breite
              <input
                type="number"
                min={640}
                value={form?.resolution.width ?? 1280}
                className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1"
                onChange={(event) => update({
                  resolution: {
                    ...(form?.resolution ?? { width: 1280, height: 720, fullscreen: false }),
                    width: Number(event.target.value)
                  }
                })}
              />
            </label>
            <label className="flex items-center gap-2">
              Höhe
              <input
                type="number"
                min={480}
                value={form?.resolution.height ?? 720}
                className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1"
                onChange={(event) => update({
                  resolution: {
                    ...(form?.resolution ?? { width: 1280, height: 720, fullscreen: false }),
                    height: Number(event.target.value)
                  }
                })}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-600 bg-slate-900"
              checked={form?.resolution.fullscreen ?? false}
              onChange={(event) =>
                update({
                  resolution: {
                    ...(form?.resolution ?? { width: 1280, height: 720, fullscreen: false }),
                    fullscreen: event.target.checked
                  }
                })
              }
            />
            Vollbild
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          className="rounded border border-slate-600 px-3 py-1 text-sm text-slate-200"
          onClick={() => setForm(selectedInstance)}
        >
          Zurücksetzen
        </button>
        <button className="rounded bg-primary px-3 py-1 text-sm font-semibold text-white" onClick={save}>
          Speichern
        </button>
      </div>
    </div>
  );
}

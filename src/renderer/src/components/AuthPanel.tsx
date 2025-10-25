import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export function AuthPanel() {
  const account = useAppStore((state) => state.account);
  const setAccount = useAppStore((state) => state.setAccount);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<{ verificationUri: string; userCode: string } | null>(null);

  const login = async () => {
    try {
      setLoading(true);
      const info = await window.cleanApi.auth.startDevice();
      setDeviceInfo({ verificationUri: info.verificationUri, userCode: info.userCode });
      setMessage(info.message);
      await window.cleanApi.auth.completeDevice();
      const accountInfo = await window.cleanApi.auth.getAccount();
      setAccount(accountInfo);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await window.cleanApi.auth.logout();
    setAccount(null);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Konto</h2>
        {account ? (
          <button className="rounded bg-red-500 px-3 py-1 text-sm font-medium text-white" onClick={logout}>
            Abmelden
          </button>
        ) : (
          <button
            className="rounded bg-primary px-3 py-1 text-sm font-medium text-white"
            onClick={login}
            disabled={loading}
          >
            {loading ? 'Warte auf Bestätigung…' : 'Mit Microsoft anmelden'}
          </button>
        )}
      </div>
      {account ? (
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded bg-slate-700" aria-hidden>
            {account.profile.skins?.[0]?.url && (
              <img src={account.profile.skins[0].url} alt="Skin" className="h-full w-full rounded object-cover" />
            )}
          </div>
          <div>
            <p className="text-sm text-slate-300">Angemeldet als</p>
            <p className="text-lg font-semibold">{account.gamertag}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-300">
          Melde dich mit deinem offiziellen Microsoft-Konto an, um Minecraft zu starten.
        </p>
      )}
      {deviceInfo && !account && (
        <div className="rounded-md border border-slate-600 bg-slate-900/80 p-3 text-sm">
          <p className="font-semibold">Code: {deviceInfo.userCode}</p>
          <p>
            Öffne <span className="font-mono">{deviceInfo.verificationUri}</span> und gib den Code ein, um den Login
            abzuschließen.
          </p>
        </div>
      )}
      {message && <p className="text-xs text-slate-400">{message}</p>}
    </div>
  );
}

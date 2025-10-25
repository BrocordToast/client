import { app } from 'electron';
import keytar from 'keytar';
import { setTimeout as delay } from 'node:timers/promises';
import { DeviceCodeResponse, MinecraftProfile, StoredAccount, MsTokenResponse, XboxAuthResponse, MinecraftTokenResponse } from './types';

const MSA_CLIENT_ID = '000000004C12AE6F';
const KEYCHAIN_SERVICE = 'clean-launcher-ms-auth';

async function getAccountStorageKey() {
  const hashSource = `${app.getName()}-${app.getVersion()}`;
  return `${KEYCHAIN_SERVICE}-${Buffer.from(hashSource).toString('hex')}`;
}

async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const response = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MSA_CLIENT_ID,
      scope: 'XboxLive.signin offline_access'
    }).toString()
  });
  if (!response.ok) {
    throw new Error(`Failed to request device code: ${response.statusText}`);
  }
  return (await response.json()) as DeviceCodeResponse;
}

async function pollToken(deviceCode: DeviceCodeResponse): Promise<MsTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    client_id: MSA_CLIENT_ID,
    device_code: deviceCode.device_code
  });

  while (true) {
    await delay(deviceCode.interval * 1000);
    const response = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = (await response.json()) as Record<string, unknown>;
    if ('error' in data) {
      if (data.error === 'authorization_pending') {
        continue;
      }
      throw new Error(`Authorization failed: ${data.error}`);
    }
    return data as MsTokenResponse;
  }
}

async function authorizeWithXbox(msToken: MsTokenResponse): Promise<XboxAuthResponse> {
  const response = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${msToken.access_token}`
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT'
    })
  });
  if (!response.ok) {
    throw new Error('Xbox authentication failed');
  }
  return (await response.json()) as XboxAuthResponse;
}

async function authorizeWithXsts(xboxToken: XboxAuthResponse): Promise<XboxAuthResponse> {
  const response = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      Properties: {
        SandboxId: 'RETAIL',
        UserTokens: [xboxToken.Token]
      },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT'
    })
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`XSTS authentication failed: ${JSON.stringify(errorBody)}`);
  }
  return (await response.json()) as XboxAuthResponse;
}

async function authorizeMinecraft(xstsToken: XboxAuthResponse): Promise<MinecraftTokenResponse> {
  const userHash = xstsToken.DisplayClaims.xui[0].uhs;
  const response = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identityToken: `XBL3.0 x=${userHash};${xstsToken.Token}`
    })
  });
  if (!response.ok) {
    throw new Error('Minecraft authentication failed');
  }
  return (await response.json()) as MinecraftTokenResponse;
}

async function loadProfile(mcToken: MinecraftTokenResponse): Promise<MinecraftProfile> {
  const response = await fetch('https://api.minecraftservices.com/minecraft/profile', {
    headers: { Authorization: `Bearer ${mcToken.access_token}` }
  });

  if (response.status === 404) {
    throw new Error('Minecraft profile not found. Ensure the account owns Minecraft.');
  }

  if (!response.ok) {
    throw new Error('Failed to load Minecraft profile');
  }

  return (await response.json()) as MinecraftProfile;
}

async function saveAccount(account: StoredAccount) {
  const key = await getAccountStorageKey();
  await keytar.setPassword(KEYCHAIN_SERVICE, key, JSON.stringify(account));
}

async function loadStoredAccount(): Promise<StoredAccount | null> {
  const key = await getAccountStorageKey();
  const raw = await keytar.getPassword(KEYCHAIN_SERVICE, key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAccount;
  } catch (error) {
    console.error('Failed to parse stored account', error);
    await keytar.deletePassword(KEYCHAIN_SERVICE, key);
    return null;
  }
}

async function clearAccount() {
  const key = await getAccountStorageKey();
  await keytar.deletePassword(KEYCHAIN_SERVICE, key);
}

export interface DeviceAuthSession {
  verificationUri: string;
  userCode: string;
  message: string;
  interval: number;
  expiresAt: number;
  deviceCode: DeviceCodeResponse;
}

export interface AuthenticatedAccount extends StoredAccount {
  accessToken: string;
}

export async function startDeviceAuth(): Promise<DeviceAuthSession> {
  if (process.env.MOCK_AUTH === 'true') {
    const now = Date.now();
    return {
      verificationUri: 'https://microsoft.com/devicelogin',
      userCode: 'MOCK-CODE',
      message: 'Mock authentication is enabled. No real login required.',
      interval: 5,
      expiresAt: now + 15 * 60 * 1000,
      deviceCode: {
        device_code: 'mock-device-code',
        user_code: 'MOCK-CODE',
        verification_uri: 'https://microsoft.com/devicelogin',
        expires_in: 900,
        interval: 5,
        message: 'Mock authentication is enabled.'
      }
    };
  }

  const deviceCode = await requestDeviceCode();
  const expiresAt = Date.now() + deviceCode.expires_in * 1000;
  return {
    verificationUri: deviceCode.verification_uri,
    userCode: deviceCode.user_code,
    message: deviceCode.message,
    interval: deviceCode.interval,
    expiresAt,
    deviceCode
  };
}

export async function completeDeviceAuth(session: DeviceAuthSession): Promise<AuthenticatedAccount> {
  if (process.env.MOCK_AUTH === 'true') {
    const profile: MinecraftProfile = {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'CleanPlayer'
    };
    const mockAccount: StoredAccount = {
      gamertag: 'CleanPlayer',
      uuid: profile.id,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: Date.now() + 3600 * 1000,
      profile
    };
    await saveAccount(mockAccount);
    return mockAccount;
  }

  const msToken = await pollToken(session.deviceCode);
  const xbox = await authorizeWithXbox(msToken);
  const xsts = await authorizeWithXsts(xbox);
  const mcToken = await authorizeMinecraft(xsts);
  const profile = await loadProfile(mcToken);

  const account: StoredAccount = {
    gamertag: profile.name,
    uuid: profile.id,
    accessToken: mcToken.access_token,
    refreshToken: msToken.refresh_token,
    expiresAt: Date.now() + mcToken.expires_in * 1000,
    profile
  };
  await saveAccount(account);
  return account;
}

export async function getStoredAccount(): Promise<AuthenticatedAccount | null> {
  const stored = await loadStoredAccount();
  if (!stored) return null;
  if (stored.expiresAt > Date.now() + 60 * 1000) {
    return stored;
  }
  try {
    return await refreshAccount(stored);
  } catch (error) {
    console.error('Failed to refresh account', error);
    await clearAccount();
    return null;
  }
}

async function refreshAccount(account: StoredAccount): Promise<AuthenticatedAccount> {
  if (process.env.MOCK_AUTH === 'true') {
    const refreshed = { ...account, expiresAt: Date.now() + 3600 * 1000 };
    await saveAccount(refreshed);
    return refreshed;
  }

  const response = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MSA_CLIENT_ID,
      scope: 'XboxLive.signin offline_access',
      grant_type: 'refresh_token',
      refresh_token: account.refreshToken
    }).toString()
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Microsoft token');
  }

  const msToken = (await response.json()) as MsTokenResponse;
  const xbox = await authorizeWithXbox(msToken);
  const xsts = await authorizeWithXsts(xbox);
  const mcToken = await authorizeMinecraft(xsts);
  const profile = await loadProfile(mcToken);

  const refreshed: StoredAccount = {
    gamertag: profile.name,
    uuid: profile.id,
    accessToken: mcToken.access_token,
    refreshToken: msToken.refresh_token,
    expiresAt: Date.now() + mcToken.expires_in * 1000,
    profile
  };
  await saveAccount(refreshed);
  return refreshed;
}

export async function logout() {
  await clearAccount();
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
  message: string;
}

export interface MsTokenResponse {
  token_type: string;
  scope: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

export interface XboxAuthResponse {
  IssueInstant: string;
  NotAfter: string;
  Token: string;
  DisplayClaims: {
    xui: Array<{ uhs: string }>;
  };
}

export interface MinecraftTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface MinecraftProfile {
  id: string;
  name: string;
  skins?: Array<{ id: string; state: string; url: string; variant: string; alias: string }>;
  capes?: Array<{ id: string; state: string; url: string; alias: string }>;
}

export interface StoredAccount {
  gamertag: string;
  uuid: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  profile: MinecraftProfile;
}

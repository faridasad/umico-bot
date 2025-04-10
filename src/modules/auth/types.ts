// src/modules/auth/types.ts
export interface SignInRequest {
  username: string;
  password: string;
}

export interface SignInResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  "not-before-policy": number;
  session_state: string;
  scope: string;
  api_key: string;
  pos_id: string;
  partner_ext_id: string;
  marketing_name_ext_id: string;
  password_changed_at: string;
  roles: string[];
}

export interface TokenRefreshResponse {
  access_token: string;
  refresh_token?: string; // May not always be returned
  expires_in: number;
}
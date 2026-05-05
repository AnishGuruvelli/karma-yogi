import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@southdevs/capacitor-google-auth';

let initPromise: Promise<void> | null = null;

export function isNativeGoogleAuthPlatform(): boolean {
  return Capacitor.isNativePlatform();
}

function isPlaceholderClientId(id: string): boolean {
  const v = id.trim();
  return !v || v === 'replace-with-google-client-id' || v.startsWith('YOUR_');
}

export async function signInWithNativeGoogle(webClientId: string): Promise<string> {
  if (isPlaceholderClientId(webClientId)) {
    throw new Error('Google sign-in is not configured.');
  }

  if (!initPromise) {
    initPromise = GoogleAuth.initialize({
      clientId: webClientId.trim(),
      scopes: ['openid', 'email', 'profile'],
      grantOfflineAccess: false,
    });
  }
  await initPromise;

  const user = await GoogleAuth.signIn({
    scopes: ['openid', 'email', 'profile'],
    serverClientId: webClientId.trim(),
    grantOfflineAccess: false,
  });

  const idToken = user.authentication?.idToken?.trim() || '';
  if (!idToken) {
    throw new Error('Google sign-in did not return an ID token.');
  }
  return idToken;
}

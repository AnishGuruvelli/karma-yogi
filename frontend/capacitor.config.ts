import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.karmayogi.app',
  appName: 'Karma Yogi',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['openid', 'email', 'profile'],
    },
  },
};

export default config;

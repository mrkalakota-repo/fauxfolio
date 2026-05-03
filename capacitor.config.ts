import type { CapacitorConfig } from '@capacitor/cli';

// Android emulator routes host machine traffic through 10.0.2.2, not localhost.
// Set CAPACITOR_SERVER_URL=http://10.0.2.2:3000 when syncing for Android dev.
const devUrl = process.env.CAPACITOR_SERVER_URL ?? 'http://localhost:3000';
const isProduction = devUrl.startsWith('https://'); // used for cleartext + debugging flags

const config: CapacitorConfig = {
  appId: 'com.fauxfolio.app',
  appName: 'FauxFolio',
  // public/ always exists; webDir is only used when server.url is NOT set (i.e. never
  // in this project — we always serve from the Next.js server). Keeping it pointing
  // at public/ avoids a "directory does not exist" error from `npx cap sync`.
  webDir: 'public',

  server: {
    url: devUrl,
    cleartext: !isProduction,
  },

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0F0F0F',
    allowsLinkPreview: false,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },

  android: {
    backgroundColor: '#0F0F0F',
    // allowMixedContent only matters when NOT using a dedicated server.url;
    // network_security_config.xml handles dev cleartext for localhost / 10.0.2.2.
    allowMixedContent: false,

    webContentsDebuggingEnabled: !isProduction,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0F0F0F',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F0F0F',
      overlaysWebView: false,
    },
  },
};

export default config;

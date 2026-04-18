import type { CapacitorConfig } from '@capacitor/cli';

const isProduction = !!process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.fauxfolio.app',
  appName: 'Fauxfolio',
  webDir: 'out',

  server: isProduction
    ? {
        url: process.env.CAPACITOR_SERVER_URL!,
        cleartext: false,
      }
    : {
        // Dev: point to local Next.js server
        url: 'http://localhost:3000',
        cleartext: true,
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
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0F0F0F',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F0F0F',
      overlaysWebView: false,
    },
  },
};

export default config;

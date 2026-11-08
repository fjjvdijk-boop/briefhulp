import type { CapacitorConfig } from "@capacitor/cli";

// De app voor de App Store en Play Store. De inhoud komt uit out/ (npm run build:app).
const config: CapacitorConfig = {
  appId: "nl.briefhulp.app",
  appName: "Briefhulp",
  webDir: "out",
  backgroundColor: "#f6f4ef",
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
  ios: {
    contentInset: "never",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: false, // de app verbergt hem zelf zodra hij klaar is
      backgroundColor: "#1b3fa6",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    LocalNotifications: {
      smallIcon: "ic_stat_briefhulp",
      iconColor: "#1b3fa6",
    },
  },
};

export default config;

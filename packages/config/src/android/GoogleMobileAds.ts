import { ConfigPlugin, ExpoConfig } from '../Config.types';
import { Document, getMainApplication, withManifest } from './Manifest';

export function getGoogleMobileAdsAppId(config: ExpoConfig) {
  return config.android?.config?.googleMobileAdsAppId ?? null;
}

export function getGoogleMobileAdsAutoInit(config: ExpoConfig) {
  return config.android?.config?.googleMobileAdsAutoInit ?? false;
}

export const withGoogleMobileAdsConfig: ConfigPlugin = config => {
  return withManifest(config, async props => ({
    ...props,
    data: await setGoogleMobileAdsConfig(config.expo, props.data),
  }));
};

export async function setGoogleMobileAdsConfig(config: ExpoConfig, manifestDocument: Document) {
  const appId = getGoogleMobileAdsAppId(config);
  const autoInit = getGoogleMobileAdsAutoInit(config);

  if (!appId) {
    return manifestDocument;
  }

  const mainApplication = getMainApplication(manifestDocument);

  // add application ID
  let existingApplicationId;
  const newApplicationId = {
    $: {
      'android:name': 'com.google.android.gms.ads.APPLICATION_ID',
      'android:value': appId,
    },
  };
  if (mainApplication.hasOwnProperty('meta-data')) {
    existingApplicationId = mainApplication['meta-data'].filter(
      (e: any) => e['$']['android:name'] === 'com.google.android.gms.ads.APPLICATION_ID'
    );
    if (existingApplicationId.length) {
      existingApplicationId[0]['$']['android:value'] = appId;
    } else {
      mainApplication['meta-data'].push(newApplicationId);
    }
  } else {
    mainApplication['meta-data'] = [newApplicationId];
  }

  // add delay auto init
  let existingDelayAutoInit;
  const newDelayAutoInit = {
    $: {
      'android:name': 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT',
      'android:value': !autoInit,
    },
  };
  if (mainApplication.hasOwnProperty('meta-data')) {
    existingDelayAutoInit = mainApplication['meta-data'].filter(
      (e: any) => e['$']['android:name'] === 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT'
    );
    if (existingDelayAutoInit.length) {
      existingDelayAutoInit[0]['$']['android:value'] = !autoInit;
    } else {
      mainApplication['meta-data'].push(newDelayAutoInit);
    }
  } else {
    mainApplication['meta-data'] = [newDelayAutoInit];
  }

  return manifestDocument;
}

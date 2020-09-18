import { resolve } from 'path';
import { Parser } from 'xml2js';

import {
  getFacebookAdvertiserIDCollection,
  getFacebookAppId,
  getFacebookAutoInitEnabled,
  getFacebookAutoLogAppEvents,
  getFacebookDisplayName,
  getFacebookScheme,
  setFacebookConfig,
  syncFacebookConfigMetaData,
} from '../Facebook';
import { getMainApplication, readAndroidManifestAsync } from '../Manifest';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

const filledManifest = `<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.expo.mycoolapp">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
      android:name=".MainApplication"
      android:label="@string/app_name"
      android:icon="@mipmap/ic_launcher"
      android:roundIcon="@mipmap/ic_launcher_round"
      android:allowBackup="true"
      android:theme="@style/AppTheme">

      <meta-data android:name="com.facebook.sdk.ApplicationId" android:value="@string/facebook_app_id"/>
      <meta-data android:name="com.facebook.sdk.ApplicationName" android:value="my-display-name"/>
      <meta-data android:name="com.facebook.sdk.AutoInitEnabled" android:value="true"/>
      <meta-data android:name="com.facebook.sdk.AutoLogAppEventsEnabled" android:value="false"/>
      <meta-data android:name="com.facebook.sdk.AdvertiserIDCollectionEnabled" android:value="false"/>

      <activity
        android:name=".MainActivity"
        android:launchMode="singleTask"
        android:label="@string/app_name"
        android:configChanges="keyboard|keyboardHidden|orientation|screenSize"
        android:windowSoftInputMode="adjustResize">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
      </activity>
      <activity android:name="com.facebook.react.devsupport.DevSettingsActivity" />

      <activity android:name="com.facebook.CustomTabActivity" android:exported="true">
        <intent-filter>
          <action android:name="android.intent.action.VIEW"/>
          <category android:name="android.intent.category.DEFAULT"/>
          <category android:name="android.intent.category.BROWSABLE"/>
          <data android:scheme="myscheme"/>
        </intent-filter>
      </activity>
    </application>

</manifest>
`;

const facebookConfig = {
  facebookScheme: 'myscheme',
  facebookAppId: 'my-app-id',
  facebookDisplayName: 'my-display-name',
  facebookAutoLogAppEventsEnabled: false,
  facebookAutoInitEnabled: true,
  facebookAdvertiserIDCollectionEnabled: false,
} as any;

describe('Android facebook config', () => {
  it(`returns null from all getters if no value provided`, () => {
    expect(getFacebookScheme({})).toBe(null);
    expect(getFacebookAppId({})).toBe(null);
    expect(getFacebookDisplayName({})).toBe(null);
    expect(getFacebookAutoLogAppEvents({})).toBe(null);
    expect(getFacebookAutoInitEnabled({})).toBe(null);
    expect(getFacebookAdvertiserIDCollection({})).toBe(null);
  });

  it(`returns correct value from all getters if value provided`, () => {
    expect(getFacebookScheme({ facebookScheme: 'myscheme' })).toMatch('myscheme');
    expect(getFacebookAppId({ facebookAppId: 'my-app-id' })).toMatch('my-app-id');
    expect(getFacebookDisplayName({ facebookDisplayName: 'my-display-name' })).toMatch(
      'my-display-name'
    );
    expect(getFacebookAutoLogAppEvents({ facebookAutoLogAppEventsEnabled: false })).toBe(false);
    expect(getFacebookAutoInitEnabled({ facebookAutoInitEnabled: true })).toBe(true);
    expect(
      getFacebookAdvertiserIDCollection({ facebookAdvertiserIDCollectionEnabled: false })
    ).toBe(false);
  });

  it('adds scheme, appid, display name, autolog events, auto init, advertiser id collection to androidmanifest.xml', async () => {
    let androidManifestJson = await readAndroidManifestAsync(sampleManifestPath);

    androidManifestJson = await setFacebookConfig(facebookConfig, androidManifestJson);
    // Run this twice to ensure copies don't get added.
    androidManifestJson = await setFacebookConfig(facebookConfig, androidManifestJson);

    const mainApplication = getMainApplication(androidManifestJson);
    const facebookActivity = mainApplication['activity'].filter(
      e => e['$']['android:name'] === 'com.facebook.CustomTabActivity'
    );
    expect(facebookActivity).toHaveLength(1);
  });

  it('removes scheme, appid, display name, autolog events, auto init, advertiser id collection to androidmanifest.xml', async () => {
    const parser = new Parser();
    let androidManifestJson = await parser.parseStringPromise(filledManifest);

    const facebookConfig = {};
    androidManifestJson = await setFacebookConfig(facebookConfig, androidManifestJson);

    const mainApplication = getMainApplication(androidManifestJson);

    const facebookActivity = mainApplication['activity'].filter(
      e => e['$']['android:name'] === 'com.facebook.CustomTabActivity'
    );
    expect(facebookActivity).toHaveLength(0);
  });

  describe('syncing', () => {
    it('adds facebook key config to metadata', async () => {
      const metadata = syncFacebookConfigMetaData(facebookConfig);

      expect(metadata).toStrictEqual({
        'com.facebook.sdk.AdvertiserIDCollectionEnabled': { value: 'false' },
        'com.facebook.sdk.ApplicationId': { value: '@string/facebook_app_id' },
        'com.facebook.sdk.ApplicationName': { value: 'my-display-name' },
        'com.facebook.sdk.AutoInitEnabled': { value: 'true' },
        'com.facebook.sdk.AutoLogAppEventsEnabled': { value: 'false' },
      });
    });

    it('removes facebook API key from existing metadata when the expo specific value is missing', async () => {
      const metadata = syncFacebookConfigMetaData({
        android: {
          config: {},
          metadata: {
            'com.facebook.sdk.AdvertiserIDCollectionEnabled': { value: 'false' },
            'com.facebook.sdk.ApplicationId': { value: '@string/facebook_app_id' },
            'com.facebook.sdk.ApplicationName': { value: 'my-display-name' },
            'com.facebook.sdk.AutoInitEnabled': { value: 'true' },
            'com.facebook.sdk.AutoLogAppEventsEnabled': { value: 'false' },
          },
        },
      } as any);

      expect(metadata).toStrictEqual({});
    });
  });
});
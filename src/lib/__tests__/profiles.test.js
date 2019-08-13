import Profiles from '../profiles';
import Constants from '../constants';

const expectedProfilesList = TestHelpers.getSupportedProfilesList();

beforeEach(() => { fetch.resetMocks(); });

test('Create Profiles object', () => {
  const profiles = new Profiles('baseUri');
  expect(profiles).toBeDefined();
});

test('fetch profiles list', async () => {
  fetch.once(JSON.stringify(expectedProfilesList));

  const profiles = new Profiles(TestHelpers.profilesFolderPath);
  const profilesList = await profiles.fetchSupportedProfilesList();
  expect(profilesList).toEqual(expectedProfilesList);
});

test('fetch profiles list twice', async () => {
  fetch.once(JSON.stringify(expectedProfilesList));

  const profiles = new Profiles(TestHelpers.profilesFolderPath);
  const profilesList = await profiles.fetchSupportedProfilesList();
  expect(profilesList).toEqual(expectedProfilesList);

  const profilesList2 = await profiles.fetchSupportedProfilesList();
  expect(profilesList2).toEqual(expectedProfilesList);
  expect(fetch.mock.calls).toHaveLength(1);
});

test('fail to fetch profiles list on first attempt and retry', async () => {
  const profiles = new Profiles(TestHelpers.profilesFolderPath);

  fetch.mockRejectOnce(new Error('File not found'), { status: 404 });
  await expect(profiles.fetchSupportedProfilesList()).rejects.toEqual(new Error('File not found'));

  fetch.once(JSON.stringify(expectedProfilesList));
  const profilesList = await profiles.fetchSupportedProfilesList();
  expect(profilesList).toEqual(expectedProfilesList);
});

test('fetch profile from array length 1', async () => {
  const profileName = 'button-controller';
  const expectedProfile = TestHelpers.getProfile(profileName);
  fetch
    .once(JSON.stringify(expectedProfilesList))
    .once(JSON.stringify(expectedProfile));

  const profiles = new Profiles(TestHelpers.profilesFolderPath);
  const profile = await profiles.fetchProfile([profileName]);
  expect(profile).toEqual(expectedProfile);
});

test('fetch second profile from array length 2', async () => {
  const profileName = 'button-controller';
  const expectedProfile = TestHelpers.getProfile(profileName);
  fetch
    .once(JSON.stringify(expectedProfilesList))
    .once(JSON.stringify(expectedProfile));

  const profiles = new Profiles(TestHelpers.profilesFolderPath);
  const profile = await profiles.fetchProfile(['Made up name', profileName]);
  expect(profile).toEqual(expectedProfile);
});

test('fetch second profile from array length 3', async () => {
  const profileName = 'button-controller';
  const expectedProfile = TestHelpers.getProfile(profileName);
  fetch
    .once(JSON.stringify(expectedProfilesList))
    .once(JSON.stringify(expectedProfile));

  const profiles = new Profiles(TestHelpers.profilesFolderPath);
  const profile = await profiles.fetchProfile(['Made up name', profileName, 'Also made up']);
  expect(profile).toEqual(expectedProfile);
});

test('fetch non-existent profile', async () => {
  fetch.once(JSON.stringify(expectedProfilesList));

  const profiles = new Profiles(TestHelpers.profilesFolderPath);
  await expect(profiles.fetchProfile(['Non existent profile'])).rejects.toEqual(new Error('No matching profile name found'));
});

test('fetch missing profile', async () => {
  const missingProfilesList = TestHelpers.copyJsonObject(expectedProfilesList);
  const missingProfileName = 'Missing Profile';
  missingProfilesList.push(missingProfileName);
  fetch
    .once(JSON.stringify(missingProfilesList))
    .mockRejectOnce(new Error('File not found'), { status: 404 });

  const profiles = new Profiles(TestHelpers.profilesFolderPath);
  await expect(profiles.fetchProfile([missingProfileName])).rejects.toEqual(new Error('File not found'));
});

test('getAssetUrl success', () => {
  const profiles = new Profiles(TestHelpers.profilesFolderPath);
  const assetName = 'none asset';
  const profile = {
    id: 'test profile',
    handedness: {
      none: { asset: assetName }
    }
  };

  const assetUrl = profiles.getAssetUrl(profile, Constants.Handedness.NONE);
  const expectedUrl = `${TestHelpers.profilesFolderPath}/${profile.id}/${assetName}`;
  expect(assetUrl).toEqual(expectedUrl);
});

test('getAssetUrl profile missing', () => {
  const profiles = new Profiles(TestHelpers.profilesFolderPath);

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const assetUrl = profiles.getAssetUrl(null, Constants.Handedness.NONE);
  }).toThrow();

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const assetUrl = profiles.getAssetUrl(undefined, Constants.Handedness.NONE);
  }).toThrow();
});

test('getAssetUrl profile id missing', () => {
  const profiles = new Profiles(TestHelpers.profilesFolderPath);
  const profile = {
    handedness: {
      none: { asset: 'assetName' }
    }
  };

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const assetUrl = profiles.getAssetUrl(profile, Constants.Handedness.NONE);
  }).toThrow();
});

test('getAssetUrl profile.handedness missing', () => {
  const profiles = new Profiles(TestHelpers.profilesFolderPath);
  const profile = {
    id: 'test profile'
  };

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const assetUrl = profiles.getAssetUrl(profile, Constants.Handedness.NONE);
  }).toThrow();
});

test('getAssetUrl invalid handedness', () => {
  const profiles = new Profiles(TestHelpers.profilesFolderPath);
  const profile = {
    id: 'test profile',
    handedness: {
      none: { asset: 'none asset' }
    }
  };

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const assetUrl = profiles.getAssetUrl(profile, Constants.Handedness.LEFT);
  }).toThrow();

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const assetUrl = profiles.getAssetUrl(profile, null);
  }).toThrow();

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const assetUrl = profiles.getAssetUrl(profile, undefined);
  }).toThrow();
});

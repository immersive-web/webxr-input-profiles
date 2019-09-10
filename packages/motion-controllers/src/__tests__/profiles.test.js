import { fetchProfile, fetchProfilesList } from '../profiles';
import Constants from '../constants';

global.fetch = require('jest-fetch-mock');

// Setup mock objects
const basePath = 'madeup/base/path';
const validProfileId = 'generic-trigger';
const validAssetPath = 'none.glb';

const validProfile = {
  layouts: {
    none: {
      assetPath: validAssetPath
    }
  }
};

const profilesList = {
  [validProfileId]: `${validProfileId}/profile.json`
};

function buildXRInputSource(profiles = [], handedness = Constants.Handedness.NONE) {
  const xrInputSource = {
    profiles,
    handedness
  };
  return xrInputSource;
}

beforeEach(() => { fetch.resetMocks(); });

describe('fetchProfilesList', () => {
  test('Successfully fetch profilesList', async () => {
    fetch.once(JSON.stringify(profilesList));

    const fetchedProfilesList = await fetchProfilesList(basePath);
    expect(fetchedProfilesList).toEqual(profilesList);
  });

  test('Bad arguments', async () => {
    await expect(fetchProfilesList(null))
      .rejects.toEqual(new Error('No basePath supplied'));

    await expect(fetchProfilesList(undefined))
      .rejects.toEqual(new Error('No basePath supplied'));
  });
});

describe('fetchProfile', () => {
  test('Bad arguments', async () => {
    const xrInputSource = buildXRInputSource();
    await expect(fetchProfile(xrInputSource, null))
      .rejects.toEqual(new Error('No basePath supplied'));

    await expect(fetchProfile(xrInputSource, undefined))
      .rejects.toEqual(new Error('No basePath supplied'));

    await expect(fetchProfile(null, basePath))
      .rejects.toEqual(new Error('No xrInputSource supplied'));

    await expect(fetchProfile(undefined, basePath))
      .rejects.toEqual(new Error('No xrInputSource supplied'));
  });

  test('Fail to first fetch profiles list', async () => {
    const xrInputSource = buildXRInputSource();

    fetch.mockRejectOnce(new Error('File not found'), { status: 404 });

    await expect(fetchProfile(xrInputSource, basePath))
      .rejects.toEqual(new Error('File not found'));
  });

  test('Successfully fetch profile with asset path', async () => {
    const xrInputSource = buildXRInputSource([validProfileId]);

    fetch
      .once(JSON.stringify(profilesList))
      .once(JSON.stringify(validProfile));

    const { profile, assetPath } = await fetchProfile(xrInputSource, basePath);
    expect(profile).toEqual(validProfile);
    expect(assetPath).toEqual(`${basePath}/${validProfileId}/${validAssetPath}`);
  });

  test('Successfully fetch profile with no asset path', async () => {
    const xrInputSource = buildXRInputSource([validProfileId]);

    const validProfileNoAssetPath = {
      layouts: { none: {} }
    };

    fetch
      .once(JSON.stringify(profilesList))
      .once(JSON.stringify(validProfileNoAssetPath));

    const { profile, assetPath } = await fetchProfile(xrInputSource, basePath);
    expect(profile).toEqual(validProfileNoAssetPath);
    expect(assetPath).toBeUndefined();
  });

  test('Successfully fetch profile skipping assetPath', async () => {
    const xrInputSource = buildXRInputSource([validProfileId], Constants.Handedness.LEFT);
    fetch
      .once(JSON.stringify(profilesList))
      .once(JSON.stringify(validProfile));

    const { profile, assetPath } = await fetchProfile(xrInputSource, basePath, false);
    expect(profile).toEqual(validProfile);
    expect(assetPath).toBeUndefined();
  });

  test('Successfully fetch second profile from array length 2', async () => {
    const xrInputSource = buildXRInputSource(['made up profile id', validProfileId]);
    fetch
      .once(JSON.stringify(profilesList))
      .once(JSON.stringify(validProfile));

    const { profile } = await fetchProfile(xrInputSource, basePath);
    expect(profile).toEqual(validProfile);
  });

  test('Successfully fetch second profile from array length 3', async () => {
    const xrInputSource = buildXRInputSource(['made up name', validProfileId, 'other made up name']);
    fetch
      .once(JSON.stringify(profilesList))
      .once(JSON.stringify(validProfile));

    const { profile } = await fetchProfile(xrInputSource, basePath);
    expect(profile).toEqual(validProfile);
  });

  test('Fail to fetch non-existent profile id', async () => {
    const xrInputSource = buildXRInputSource(['made up name']);
    fetch.once(JSON.stringify(profilesList));

    await expect(fetchProfile(xrInputSource, basePath))
      .rejects.toEqual(new Error('No matching profile name found'));
  });

  test('Fail to fetch etch missing profile JSON', async () => {
    const xrInputSource = buildXRInputSource([validProfileId]);
    fetch
      .once(JSON.stringify(profilesList))
      .mockRejectOnce(new Error('File not found'), { status: 404 });

    await expect(fetchProfile(xrInputSource, basePath))
      .rejects.toEqual(new Error('File not found'));
  });

  test('Fail to fetch profile with mismatched handedness', async () => {
    const xrInputSource = buildXRInputSource([validProfileId], Constants.Handedness.LEFT);
    fetch
      .once(JSON.stringify(profilesList))
      .once(JSON.stringify(validProfile));

    await expect(fetchProfile(xrInputSource, basePath))
      .rejects.toEqual(new Error(`No matching handedness, left, in profile ${validProfileId}`));
  });
});

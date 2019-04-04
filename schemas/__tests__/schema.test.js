const validator = TestHelpers.getValidator();
const validProfile = {
  version: '0.1',
  id: 'mock1',
  handedness: {
    none: {
      asset: 'asset name',
      root: 'root name',
      components: [0],
      selectionComponent: 0
    }
  },
  components: [
    {
      dataSource: 0,
      root: 'component root name',
      labelTransform: 'label transform name'
    }
  ],
  dataSources: [
    {
      id: 'a button',
      dataSourceType: 'buttonSource',
      buttonIndex: 0
    }
  ]
};

test('Valid profile', () => {
  let valid = false;
  const profile = TestHelpers.copyJsonObject(validProfile);

  valid = validator(profile);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  const visualResponse = {
    rootNodeName: 'root node',
    source: 'state',
    states: ['default']
  };
  profile.visualResponses = [visualResponse];
  valid = validator(profile);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test('Invalid missing version', () => {
  const profile = TestHelpers.copyJsonObject(validProfile);
  delete profile.version;
  expect(validator(profile)).toBe(false);
});

test('Invalid missing id', () => {
  const profile = TestHelpers.copyJsonObject(validProfile);
  delete profile.id;
  expect(validator(profile)).toBe(false);
});

test('Invalid missing handedness', () => {
  const profile = TestHelpers.copyJsonObject(validProfile);
  delete profile.handedness;
  expect(validator(profile)).toBe(false);
});

test('Invalid missing components', () => {
  const profile = TestHelpers.copyJsonObject(validProfile);
  delete profile.components;
  expect(validator(profile)).toBe(false);
});

test('Invalid missing dataSources', () => {
  const profile = TestHelpers.copyJsonObject(validProfile);
  delete profile.dataSources;
  expect(validator(profile)).toBe(false);
});

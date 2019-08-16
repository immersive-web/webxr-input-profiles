import Constants from '../constants';
import MotionController from '../motionController';
import MockXRInputSource from '../../mocks/mockXRInputSource';
import MockGamepad from '../../mocks/mockGamepad';

const gamepadId = 'mock';
const profile = {
  handedness: {
    none: {
      components: [0]
    }
  },
  components: [
    { dataSource: 0 },
    { dataSource: 1, visualResponses: [0, 1] },
    { dataSource: 2 }
  ],
  dataSources: [
    {
      dataSourceType: Constants.DataSourceType.BUTTON,
      buttonIndex: 0
    },
    {
      dataSourceType: Constants.DataSourceType.TOUCHPAD,
      xAxis: 0,
      yAxis: 1
    },
    {
      dataSourceType: Constants.DataSourceType.THUMBSTICK,
      buttonIndex: 0,
      xAxis: 0,
      yAxis: 1
    }
  ],
  visualResponses: [
    {},
    {}
  ]
};
const assetUrl = 'assetUrl string';

test('No xrInputSource', () => {
  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const motionController = new MotionController(undefined, profile, assetUrl);
  }).toThrow();

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const motionController = new MotionController(null, profile, assetUrl);
  }).toThrow();
});

test('No profile', () => {
  const mockXRInputSource = new MockXRInputSource(gamepadId, Constants.Handedness.NONE);

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const motionController = new MotionController(mockXRInputSource, undefined, assetUrl);
  }).toThrow();

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const motionController = new MotionController(mockXRInputSource, null, assetUrl);
  }).toThrow();
});

test('No assetUrl', () => {
  const mockXRInputSource = new MockXRInputSource(gamepadId, Constants.Handedness.NONE);

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const motionController = new MotionController(mockXRInputSource, profile, null);
  }).toThrow();

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const motionController = new MotionController(mockXRInputSource, profile, undefined);
  }).toThrow();
});

test('No gamepad', () => {
  const mockXRInputSource = new MockXRInputSource(gamepadId, Constants.Handedness.NONE);

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const motionController = new MotionController(mockXRInputSource, profile, assetUrl);
  }).toThrow();
});

test('Successful construction', () => {
  const mockGamepad = new MockGamepad(profile, Constants.Handedness.NONE);
  const mockXRInputSource = new MockXRInputSource(mockGamepad, Constants.Handedness.NONE);
  const motionController = new MotionController(mockXRInputSource, profile, assetUrl);
  expect(motionController).toBeDefined();
});

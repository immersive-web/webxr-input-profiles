import Constants from '../constants';
import MotionController from '../motionController';
import MockXRInputSource from '../mocks/mockXRInputSource';
import MockGamepad from '../mocks/mockGamepad';

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

test('No xrInputSource', () => {
  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const motionController = new MotionController(undefined, profile);
  }).toThrow();

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const motionController = new MotionController(null, profile);
  }).toThrow();
});

test('No profile', () => {
  const mockXRInputSource = new MockXRInputSource(gamepadId, Constants.Handedness.NONE);

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const motionController = new MotionController(mockXRInputSource, undefined);
  }).toThrow();

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const motionController = new MotionController(mockXRInputSource, null);
  }).toThrow();
});

test('No gamepad', () => {
  const mockXRInputSource = new MockXRInputSource(gamepadId, Constants.Handedness.NONE);

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const motionController = new MotionController(mockXRInputSource, profile);
  }).toThrow();
});

test('Successful construction', () => {
  const mockGamepad = new MockGamepad(profile);
  const mockXRInputSource = new MockXRInputSource(mockGamepad, Constants.Handedness.NONE);
  const motionController = new MotionController(mockXRInputSource, profile);
  expect(motionController).toBeDefined();
});

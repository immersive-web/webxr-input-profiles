import Constants from '../constants';
import {
  Button, Thumbstick, Touchpad, Axes, Component
} from '../components';

const componentDescription = { dataSource: 0 };

const buttonProfile = {
  components: [componentDescription],
  dataSources: [{
    dataSourceType: Constants.DataSourceType.BUTTON,
    buttonIndex: 0
  }]
};

const touchpadProfile = {
  components: [componentDescription],
  dataSources: [{
    dataSourceType: Constants.DataSourceType.TOUCHPAD,
    xAxisIndex: 0,
    yAxisIndex: 1
  }]
};

const thumbstickProfile = {
  components: [componentDescription],
  dataSources: [{
    dataSourceType: Constants.DataSourceType.THUMBSTICK,
    xAxisIndex: 0,
    yAxisIndex: 1,
    buttonIndex: 0
  }]
};

test('Button created', () => {
  const button = new Button(buttonProfile, componentDescription);
  expect(button).toBeDefined();
  expect(button.buttonValue).toEqual(0);
  expect(button.state).toEqual(Constants.ComponentState.DEFAULT);
  expect(button.analogButtonValues).toBeUndefined();
  expect(button.pressUnsupported).toBeUndefined();
});

test('Button created with analogValues', () => {
  const analogButtonProfile = TestHelpers.copyJsonObject(buttonProfile);
  analogButtonProfile.dataSources[0].analogValues = true;
  const button = new Button(analogButtonProfile, componentDescription);
  expect(button).toBeDefined();
  expect(button.analogButtonValues).toEqual(true);
});

test('Button created with pressUnsupported', () => {
  const pressUnsupportedProfile = TestHelpers.copyJsonObject(buttonProfile);
  pressUnsupportedProfile.dataSources[0].pressUnsupported = true;
  const button = new Button(pressUnsupportedProfile, componentDescription);
  expect(button).toBeDefined();
  expect(button.pressUnsupported).toEqual(true);
});

test('Touchpad created', () => {
  const touchpad = new Touchpad(touchpadProfile, componentDescription);
  expect(touchpad).toBeDefined();
});

test('Thumbstick created', () => {
  const thumbstick = new Thumbstick(thumbstickProfile, componentDescription);
  expect(thumbstick).toBeDefined();
});

test('Axes component created with NO button', () => {
  const axesComponent = new Axes(touchpadProfile, componentDescription);
  expect(axesComponent).toBeDefined();
  expect(axesComponent.xAxis).toEqual(0);
  expect(axesComponent.yAxis).toEqual(0);
  expect(axesComponent.buttonValue).toBeUndefined();
  expect(axesComponent.state).toEqual(Constants.ComponentState.DEFAULT);
  expect(axesComponent.analogButtonValues).toBeUndefined();
  expect(axesComponent.pressUnsupported).toEqual(true);
});

test('Axes component created with button', () => {
  const axesComponent = new Axes(thumbstickProfile, componentDescription);
  expect(axesComponent).toBeDefined();
  expect(axesComponent.xAxis).toEqual(0);
  expect(axesComponent.yAxis).toEqual(0);
  expect(axesComponent.buttonValue).toEqual(0);
  expect(axesComponent.state).toEqual(Constants.ComponentState.DEFAULT);
  expect(axesComponent.analogButtonValues).toBeUndefined();
  expect(axesComponent.pressUnsupported).toBeUndefined();
});

test('Axes component created with button with pressUnsupported', () => {
  const pressUnsupportedProfile = TestHelpers.copyJsonObject(thumbstickProfile);
  pressUnsupportedProfile.dataSources[0].pressUnsupported = true;
  const axesComponent = new Axes(pressUnsupportedProfile, componentDescription);
  expect(axesComponent.pressUnsupported).toEqual(true);
});

test('Axes component created with button with analogButtonValues', () => {
  const analogButtonProfile = TestHelpers.copyJsonObject(thumbstickProfile);
  analogButtonProfile.dataSources[0].analogButtonValues = true;
  const axesComponent = new Axes(analogButtonProfile, componentDescription);
  expect(axesComponent.analogButtonValues).toEqual(true);
});

test('No profile', () => {
  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const component = new Component(null, componentDescription);
  }).toThrow();

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const component = new Component(undefined, componentDescription);
  }).toThrow();
});

test('No componentDescription', () => {
  const profile = {};

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const component = new Component(profile, null);
  }).toThrow();

  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const component = new Component(profile, undefined);
  }).toThrow();
});

test('Button fails to create with thumbstick data source', () => {
  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const button = new Button(thumbstickProfile, componentDescription);
  }).toThrow();
});

test('Button fails to create with touchpad data source', () => {
  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const button = new Button(touchpadProfile, componentDescription);
  }).toThrow();
});

test('Touchpad fails to create with thumbstick data source', () => {
  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const touchpad = new Touchpad(thumbstickProfile, componentDescription);
  }).toThrow();
});

test('Touchpad fails to create with button data source', () => {
  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const touchpad = new Touchpad(buttonProfile, componentDescription);
  }).toThrow();
});

test('Thumbstick fails to create with thumbstick data source', () => {
  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const thumbstick = new Thumbstick(touchpadProfile, componentDescription);
  }).toThrow();
});

test('Thumbstick fails to create with button data source', () => {
  expect(() => {
    // eslint-disable-next-line no-unused-vars
    const thumbstick = new Thumbstick(buttonProfile, componentDescription);
  }).toThrow();
});

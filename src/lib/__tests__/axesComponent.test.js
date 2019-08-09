import Constants from '../constants';
import { Axes } from '../components';
import MockGamepad from '../../mocks/mockGamepad';

const xAxisIndex = 0;
const yAxisIndex = 1;
const buttonIndex = 0;

const handednessDescription = {
  none: { components: [0] }
};
const componentDescription = { dataSource: 0 };

const noButtonProfile = {
  handedness: handednessDescription,
  components: [componentDescription],
  dataSources: [{
    dataSourceType: Constants.DataSourceType.TOUCHPAD,
    xAxisIndex,
    yAxisIndex
  }]
};

const buttonProfile = {
  handedness: handednessDescription,
  components: [componentDescription],
  dataSources: [{
    dataSourceType: Constants.DataSourceType.THUMBSTICK,
    xAxisIndex,
    yAxisIndex,
    buttonIndex
  }]
};

test('xAxis value below touch threshold', () => {
  const axisComponent = new Axes(noButtonProfile, componentDescription);
  const mockGamepad = new MockGamepad(noButtonProfile, Constants.Handedness.NONE);
  mockGamepad.axes[xAxisIndex] = 0.01;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.xAxis).toEqual(0.01);
  expect(axisComponent.state).toBe(Constants.ComponentState.DEFAULT);
});

test('xAxis value above touch threshold', () => {
  const axisComponent = new Axes(noButtonProfile, componentDescription);
  const mockGamepad = new MockGamepad(noButtonProfile, Constants.Handedness.NONE);
  mockGamepad.axes[xAxisIndex] = 0.5;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.xAxis).toEqual(0.5);
  expect(axisComponent.state).toBe(Constants.ComponentState.TOUCHED);
});

test('yAxis value below touch threshold', () => {
  const axisComponent = new Axes(noButtonProfile, componentDescription);
  const mockGamepad = new MockGamepad(noButtonProfile, Constants.Handedness.NONE);
  mockGamepad.axes[yAxisIndex] = 0.01;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.yAxis).toEqual(0.01);
  expect(axisComponent.state).toBe(Constants.ComponentState.DEFAULT);
});

test('yAxis value above touch threshold', () => {
  const axisComponent = new Axes(noButtonProfile, componentDescription);
  const mockGamepad = new MockGamepad(noButtonProfile, Constants.Handedness.NONE);
  mockGamepad.axes[yAxisIndex] = -0.5;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.yAxis).toEqual(-0.5);
  expect(axisComponent.state).toBe(Constants.ComponentState.TOUCHED);
});

test('xAxis to be rounded down', () => {
  const axisComponent = new Axes(noButtonProfile, componentDescription);
  const mockGamepad = new MockGamepad(noButtonProfile, Constants.Handedness.NONE);
  mockGamepad.axes[xAxisIndex] = 5;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.xAxis).toEqual(1);
  expect(axisComponent.state).toBe(Constants.ComponentState.TOUCHED);
});

test('yAxis to be rounded down', () => {
  const axisComponent = new Axes(noButtonProfile, componentDescription);
  const mockGamepad = new MockGamepad(noButtonProfile, Constants.Handedness.NONE);
  mockGamepad.axes[yAxisIndex] = 5;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.yAxis).toEqual(1);
  expect(axisComponent.state).toBe(Constants.ComponentState.TOUCHED);
});

test('xAxis to be rounded up', () => {
  const axisComponent = new Axes(noButtonProfile, componentDescription);
  const mockGamepad = new MockGamepad(noButtonProfile, Constants.Handedness.NONE);
  mockGamepad.axes[xAxisIndex] = -5;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.xAxis).toEqual(-1);
  expect(axisComponent.state).toBe(Constants.ComponentState.TOUCHED);
});

test('yAxis to be rounded up', () => {
  const axisComponent = new Axes(noButtonProfile, componentDescription);
  const mockGamepad = new MockGamepad(noButtonProfile, Constants.Handedness.NONE);
  mockGamepad.axes[yAxisIndex] = -5;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.yAxis).toEqual(-1);
  expect(axisComponent.state).toBe(Constants.ComponentState.TOUCHED);
});

test('button below touch threshold and rounded up', () => {
  const axisComponent = new Axes(buttonProfile, componentDescription);
  const mockGamepad = new MockGamepad(buttonProfile, Constants.Handedness.NONE);
  mockGamepad.buttons[buttonIndex].value = -5;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.yAxis).toEqual(0);
  expect(axisComponent.state).toBe(Constants.ComponentState.DEFAULT);
});

test('button above touch threshold', () => {
  const axisComponent = new Axes(buttonProfile, componentDescription);
  const mockGamepad = new MockGamepad(buttonProfile, Constants.Handedness.NONE);
  mockGamepad.buttons[buttonIndex].value = 0.5;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.buttonValue).toEqual(0.5);
  expect(axisComponent.state).toBe(Constants.ComponentState.TOUCHED);
});

test('button rounded down', () => {
  const axisComponent = new Axes(buttonProfile, componentDescription);
  const mockGamepad = new MockGamepad(buttonProfile, Constants.Handedness.NONE);
  mockGamepad.buttons[buttonIndex].value = 5;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.buttonValue).toEqual(1);
  expect(axisComponent.state).toBe(Constants.ComponentState.PRESSED);
});

test('button pressed', () => {
  const axisComponent = new Axes(buttonProfile, componentDescription);
  const mockGamepad = new MockGamepad(buttonProfile, Constants.Handedness.NONE);

  mockGamepad.buttons[buttonIndex].pressed = true;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.state).toBe(Constants.ComponentState.PRESSED);

  mockGamepad.buttons[buttonIndex].touched = true;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.state).toBe(Constants.ComponentState.PRESSED);
});

test('button touched', () => {
  const axisComponent = new Axes(buttonProfile, componentDescription);
  const mockGamepad = new MockGamepad(buttonProfile, Constants.Handedness.NONE);
  mockGamepad.buttons[buttonIndex].touched = true;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.state).toBe(Constants.ComponentState.TOUCHED);
});

test('button pressed and axis over touch threshold', () => {
  const axisComponent = new Axes(buttonProfile, componentDescription);
  const mockGamepad = new MockGamepad(buttonProfile, Constants.Handedness.NONE);
  mockGamepad.buttons[buttonIndex].pressed = true;
  mockGamepad.axes[xAxisIndex] = 0.5;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.xAxis).toEqual(0.5);
  expect(axisComponent.state).toBe(Constants.ComponentState.PRESSED);
});

test('x axis inverted', () => {
  const invertedProfile = TestHelpers.copyJsonObject(noButtonProfile);
  invertedProfile.dataSources[0].webVR_xAxisInverted = true;

  const axisComponent = new Axes(invertedProfile, componentDescription);
  const mockGamepad = new MockGamepad(invertedProfile, Constants.Handedness.NONE);

  mockGamepad.axes[xAxisIndex] = 0.5;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.xAxis).toEqual(-0.5);

  mockGamepad.axes[xAxisIndex] = -0.5;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.xAxis).toEqual(0.5);
});

test('y axis inverted', () => {
  const invertedProfile = TestHelpers.copyJsonObject(noButtonProfile);
  invertedProfile.dataSources[0].webVR_yAxisInverted = true;

  const axisComponent = new Axes(invertedProfile, componentDescription);
  const mockGamepad = new MockGamepad(invertedProfile, Constants.Handedness.NONE);

  mockGamepad.axes[yAxisIndex] = 0.5;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.yAxis).toEqual(-0.5);

  mockGamepad.axes[yAxisIndex] = -0.5;
  axisComponent.updateFromGamepad(mockGamepad);
  expect(axisComponent.yAxis).toEqual(0.5);
});

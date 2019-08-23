import Constants from '../constants';
import { Button } from '../components';
import MockGamepad from '../../mocks/mockGamepad';

const buttonIndex = 0;
const handednessDescription = {
  none: { components: [0] }
};
const componentDescription = { dataSource: 0 };
const profile = {
  handedness: handednessDescription,
  components: [componentDescription],
  dataSources: [{
    dataSourceType: Constants.DataSourceType.BUTTON,
    buttonIndex
  }]
};

test('Value below touch threshold', () => {
  const button = new Button(profile, componentDescription);
  const mockGamepad = new MockGamepad(profile, Constants.Handedness.NONE);
  mockGamepad.buttons[buttonIndex].value = 0.01;
  button.updateFromGamepad(mockGamepad);
  expect(button.buttonValue).toEqual(mockGamepad.buttons[buttonIndex].value);
  expect(button.state).toEqual(Constants.ComponentState.DEFAULT);
});

test('Value above touch threshold', () => {
  const button = new Button(profile, componentDescription);
  const mockGamepad = new MockGamepad(profile, Constants.Handedness.NONE);
  mockGamepad.buttons[buttonIndex].value = 0.4;
  button.updateFromGamepad(mockGamepad);
  expect(button.buttonValue).toEqual(mockGamepad.buttons[buttonIndex].value);
  expect(button.state).toEqual(Constants.ComponentState.TOUCHED);
});

test('Value to be rounded down', () => {
  const button = new Button(profile, componentDescription);
  const mockGamepad = new MockGamepad(profile, Constants.Handedness.NONE);
  mockGamepad.buttons[buttonIndex].value = 2;
  button.updateFromGamepad(mockGamepad);
  expect(button.buttonValue).toEqual(1);
  expect(button.state).toEqual(Constants.ComponentState.PRESSED);
});

test('Touched', () => {
  const button = new Button(profile, componentDescription);
  const mockGamepad = new MockGamepad(profile, Constants.Handedness.NONE);
  mockGamepad.buttons[buttonIndex].touched = true;
  button.updateFromGamepad(mockGamepad);
  expect(button.buttonValue).toEqual(0);
  expect(button.state).toEqual(Constants.ComponentState.TOUCHED);
});

test('Pressed', () => {
  const button = new Button(profile, componentDescription);
  const mockGamepad = new MockGamepad(profile, Constants.Handedness.NONE);

  mockGamepad.buttons[buttonIndex].pressed = true;
  button.updateFromGamepad(mockGamepad);
  expect(button.buttonValue).toEqual(0);
  expect(button.state).toEqual(Constants.ComponentState.PRESSED);
});

test('Touched and pressed', () => {
  const button = new Button(profile, componentDescription);
  const mockGamepad = new MockGamepad(profile, Constants.Handedness.NONE);

  mockGamepad.buttons[buttonIndex].touched = true;
  mockGamepad.buttons[buttonIndex].pressed = true;
  button.updateFromGamepad(mockGamepad);
  expect(button.buttonValue).toEqual(0);
  expect(button.state).toEqual(Constants.ComponentState.PRESSED);
});

test('Set value to 1 and touched', () => {
  const button = new Button(profile, componentDescription);
  const mockGamepad = new MockGamepad(profile, Constants.Handedness.NONE);

  mockGamepad.buttons[buttonIndex].touched = true;
  mockGamepad.buttons[buttonIndex].value = 1;
  button.updateFromGamepad(mockGamepad);
  expect(button.buttonValue).toEqual(1);
  expect(button.state).toEqual(Constants.ComponentState.PRESSED);
});

test('Set value to 10 and touched', () => {
  const button = new Button(profile, componentDescription);
  const mockGamepad = new MockGamepad(profile, Constants.Handedness.NONE);

  mockGamepad.buttons[buttonIndex].touched = true;
  mockGamepad.buttons[buttonIndex].value = 10;
  button.updateFromGamepad(mockGamepad);
  expect(button.buttonValue).toEqual(1);
  expect(button.state).toEqual(Constants.ComponentState.PRESSED);
});

test('Set value below touch threshold and touched', () => {
  const button = new Button(profile, componentDescription);
  const mockGamepad = new MockGamepad(profile, Constants.Handedness.NONE);

  mockGamepad.buttons[buttonIndex].touched = true;
  mockGamepad.buttons[buttonIndex].value = 0.005;
  button.updateFromGamepad(mockGamepad);
  expect(button.buttonValue).toEqual(0.005);
  expect(button.state).toEqual(Constants.ComponentState.TOUCHED);
});

test('Set value below touch threshold and pressed', () => {
  const button = new Button(profile, componentDescription);
  const mockGamepad = new MockGamepad(profile, Constants.Handedness.NONE);

  mockGamepad.buttons[buttonIndex].pressed = true;
  mockGamepad.buttons[buttonIndex].value = 0.005;
  button.updateFromGamepad(mockGamepad);
  expect(button.buttonValue).toEqual(0.005);
  expect(button.state).toEqual(Constants.ComponentState.PRESSED);
});

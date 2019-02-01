const gamepadId = "045E-065D";
const MockGamepad = require("../mocks/mockGamepad.js");
const mockGamepad = new MockGamepad(gamepadId);

const GamepadMapping = require("../src/gamepadMapping");
const gamepadMapping = new GamepadMapping(mockGamepad, "left");

mockGamepad.initialize(gamepadMapping);

test("Load handed controller", () => {
  mockGamepad.reset();
  let actualComponentIdList = gamepadMapping.getComponentsList();
  const expectedComponentIdList = ["trigger", "thumbstick", "grip", "touchpad", "menu"];
  expect(actualComponentIdList).toEqual(expect.arrayContaining(expectedComponentIdList));
  expect(actualComponentIdList).toHaveLength(expectedComponentIdList.length);
});

test("Validate trigger changes", () => {
  mockGamepad.reset();
  const triggerId = "trigger";
  let trigger = mockGamepad.mockComponents[triggerId];
  trigger.setValues( {"button": 0.5} );
  let actualTriggerValues = gamepadMapping.getValues(triggerId);
  const expectedTriggerValues = {
    button: { value: 0.5, touched: true, pressed: false }
  };
  expect(actualTriggerValues).toMatchObject(expectedTriggerValues);
  gamepadMapping.updateVisuals(mockGamepad);
});

test("Validate trigger changes", () => {
  mockGamepad.reset();
  const thumbstickId = "thumbstick";
  let thumbstick = mockGamepad.mockComponents[thumbstickId];
  thumbstick.setValues( {"xAxis": 0.2} );
  let actualThumbstickValues = gamepadMapping.getValues(thumbstickId);
  const expectedThumbstickValues = {
    button: { value: 0, touched: true, pressed: false },
    xAxis: { value: 0.2 },
    yAxis: { value: 0 }
  };
  expect(actualThumbstickValues).toMatchObject(expectedThumbstickValues);
  gamepadMapping.updateVisuals(mockGamepad);
});
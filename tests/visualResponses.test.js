const TestHelpers = require("./testHelpers.js");
const MockGamepad = require("./mockGamepad/mockGamepad.js");
const XRGamepad = require("../src/xrGamepad.js");

let testTable = [];
const useMocks = true;
const mappingList = TestHelpers.getMappingsList(useMocks);
mappingList.forEach((gamepadId) => {
  let mapping = TestHelpers.getMappingById(gamepadId, useMocks);
  if (mapping.visualResponses && mapping.hands.neutral) {
    testTable.push([gamepadId, mapping]);
  }
});

test.each(testTable)("visualResponseTest.%s", (gamepadId, mapping) => {
  let mockGamepad = new MockGamepad(mapping, "neutral");
  expect(mockGamepad).toBeDefined();

  let xrGamepad = new XRGamepad(mockGamepad, "neutral", mapping);
  expect(xrGamepad).toBeDefined();

  let mockComponent = mockGamepad.mockComponents["a button"];
  let expectedValues = { button: {value: .2, touched: true} };
  mockComponent.setValues(expectedValues);
  let actualValues = mockComponent.getValues();
  expect(actualValues).toMatchObject(expectedValues);

  let component = Object.values(xrGamepad.xrGamepadComponents)[0];
  let actualWeightedVisualzations = component.getWeightedVisualizations();
  let expectedWeightedVisualzations = {
    "targetNode": {
      buttonMin: { weight: 0.8, node: "buttonMinNode" },
      buttonMax: { weight: 0.2, node: "buttonMaxNode" }
    }
  }
  expect(actualWeightedVisualzations).toEqual(expectedWeightedVisualzations);
});

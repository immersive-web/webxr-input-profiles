const TestHelpers = require("./testHelpers.js");
const MockGamepad = require("./mockGamepad/mockGamepad.js");
const XRGamepadComponent = require("../src/xrGamepadComponent.js");
const Constants = require("../src/constants.js");

const gamepadId = "mock3";
const handedness = "neutral";
let mockGamepad;

const mapping = Object.freeze(TestHelpers.getMappingById(gamepadId, handedness));

const defaultTestValues = [
  [ "default", {}, null ]
]

const buttonTestValues = [
  [ "button touched", { button: 0.4 },  null ],
  [ "button pressed", { button: 1 },    null ]
];

const axesTestValues = [
  [ "xAxis negative", { xAxis: -0.4 },  { left: 0.4 } ],
  [ "xAxis positive", { xAxis: 0.4 },   { right: 0.4 } ],
  [ "yAxis negative", { yAxis: -0.4 },  { top: 0.4 } ],
  [ "yAxis positive", { yAxis: 0.4 },   { bottom: 0.4 } ],

  [ "xAxis negative and yAxis positive", { xAxis: -0.3, yAxis: 0.4 },   { left: 0.3, bottom: 0.4 } ],
  [ "xAxis positive and yAxis positive", { xAxis: 0.3, yAxis: 0.4 },    { right: 0.3, bottom: 0.4 } ],
  [ "xAxis negative and yAxis negative", { xAxis: -0.3, yAxis: -0.4 },  { left: 0.3, top: 0.4 } ],
  [ "xAxis positive and yAxis negative", { xAxis: 0.3, yAxis: -0.4 },   { right: 0.3, top: 0.4 } ]
];

const buttonsAxesTestValues = [
  [ "xAxis negative and button touched", { xAxis: -0.4, button: 0.7 },  { left: 0.4, button: 0.7 } ],
  [ "xAxis positive and button pressed", { xAxis: 0.4, button: 1 },   { right: 0.4, button: 1 } ],

  [ "xAxis negative and yAxis positive and button touched", { xAxis: -0.3, yAxis: 0.4, button: 0.7 }, { left: 0.3, bottom: 0.4, button: 0.7 } ],
  [ "xAxis positive and yAxis negative and button pressed", { xAxis: 0.3, yAxis: -0.4, button: 1 },   { right: 0.3, top: 0.4, button: 1 } ]
];

const dpadFromButtonsTestValues = [
  [ "left touched",   { left: 0.4 },    null ],
  [ "left pressed",   { left: 1 },      null ],
  [ "right touched",  { right: 0.4 },   null ],
  [ "right pressed",  { right: 1 },     null ],
  [ "top touched",    { top: 0.4 },     null ],
  [ "top pressed",    { top: 1 },       null ],
  [ "bottom touched", { bottom: 0.4 },  null ],
  [ "bottom pressed", { bottom: 1 },    null ],

  [ "left and top touched",     { left: 0.3, top: 0.4 },      null ],
  [ "right and top touched",    { right: 0.3, top: 0.4 },     null ],
  [ "left and bottom touched",  { left: 0.3, bottom: 0.4 },   null ],
  [ "right and bottom touched", { right: 0.3, bottom: 0.4 },  null ],

  [ "left and top pressed",     { left: 1, top: 1 },      null ],
  [ "right and top pressed",    { right: 1, top: 1 },     null ],
  [ "left and bottom pressed",  { left: 1, bottom: 1 },   null ],
  [ "right and bottom pressed", { right: 1, bottom: 1 },  null ],

  [ "left touched and top pressed",     { left: 0.4, top: 1 },      null ],
  [ "right touched and top pressed",    { right: 0.4, top: 1 },     null ],
  [ "left touched and bottom pressed",  { left: 0.4, bottom: 1 },   null ],
  [ "right touched and bottom pressed", { right: 0.4, bottom: 1 },  null ],
];

const testsTable = [
  ["button",          0, [...defaultTestValues, ...buttonTestValues]],
  ["touchpad",        1, [...defaultTestValues, ...axesTestValues]],
  ["thumbstick",      2, [...defaultTestValues, ...buttonTestValues, ...axesTestValues, ...buttonsAxesTestValues]],
  ["dpadFromAxes",    3, [...defaultTestValues, ...axesTestValues]],
  ["dpadFromButtons", 4, [...defaultTestValues, ...dpadFromButtonsTestValues]],
];

beforeAll(() => {
  // Double check the mapping file is good
  // TODO consider validating all mock files in mappings.test.js?
  expect(mapping).not.toBeNull();

  const validator = TestHelpers.getValidator();
  const valid = validator(mapping);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

beforeEach(() => {
  mockGamepad = new MockGamepad(mapping, handedness);
  expect(mockGamepad).toBeDefined();
});

describe.each(testsTable)("xrGamepadComponent.%s", (dataSourceId, componentIndex, dataTestsTable) => {

  test("Create XRGamepadComponent", () => {
    let xrGamepadComponent = new XRGamepadComponent(componentIndex, mapping, mockGamepad);
    expect(xrGamepadComponent);
    expect(xrGamepadComponent.id).toEqual(dataSourceId);
    switch(dataSourceId) {
      case "dpadFromButtons":
        expect(xrGamepadComponent.partsCount).toEqual(4);
        break;
      case "thumbstick":
        expect(xrGamepadComponent.partsCount).toEqual(3);
        break;
      case "touchpad":
      case "dpadFromAxes":
        expect(xrGamepadComponent.partsCount).toEqual(2);
        break;
      case "button":
        expect(xrGamepadComponent.partsCount).toEqual(1);
        break;
      default:
        throw new Error("Unexpected data source in mock mapping file");
    }
  });

  test("Get Component State", () => {
    let xrGamepadComponent = new XRGamepadComponent(componentIndex, mapping, mockGamepad);
    let componentState = xrGamepadComponent.getComponentState();
    expect(componentState).toEqual(Constants.ComponentState.DEFAULT);
  });

  test.each(dataTestsTable)(`GetData w/ %s`, (testName, dataOverrides, dataAsButtons) => {
    let xrGamepadComponent = new XRGamepadComponent(componentIndex, mapping, mockGamepad);

    let expectedData = TestHelpers.makeData(xrGamepadComponent.partsCount, dataOverrides);
    mockGamepad.mockComponents[dataSourceId].setValues(expectedData);

    let actualData = xrGamepadComponent.getData();
    expect(actualData).toMatchObject(expectedData);

    if (dataAsButtons) {
      expectedData = TestHelpers.makeData(xrGamepadComponent.partsCount + 2, dataAsButtons);
      actualData = xrGamepadComponent.getData(true);
      expect(actualData).toMatchObject(expectedData);
    }
  });

  test.todo("getWeightedVisualizations");
  /*
  test.each(Object.entries(testData))("getWeightedVisualization.%s", (name, data) => {
    const mapping = TestHelpers.getMappingById(gamepadId, handedness);
    const visualResponse = mapping.visualResponses[visualResponseIndex];
    
    const xrGamepadVisualResponse = new XRGamepadVisualResponse(visualResponse);
    const actualResult = xrGamepadVisualResponse.getWeightedVisualization(data);
    expect(actualResult).toBeDefined();

    // Confirm the correct number of entries is present
    if (name == "default") {
      expect(Object.keys(actualResult)).toHaveLength(0);
    } else {
      switch (category) {
        case "1DOF":
          var expectedLength = 2;
          break;
        case "2DOF.Buttons":
        case "2DOF.Axes":
          var expectedLength = 4;
          break;
        case "3DOF":
          var expectedLength = 6;
          break;
      }
      expect(Object.keys(actualResult)).toHaveLength(expectedLength);

      if (data.isPressed) {
        var regexp = /PRESS$/;
      } else {
        var regexp = /TOUCH$/;
      }
      
      Object.values(actualResult).forEach(element => {
        // Check that all the keys are for the right user action
        expect(element.node).toEqual(expect.stringMatching(regexp));
      });
    }
    
  });
  */
});


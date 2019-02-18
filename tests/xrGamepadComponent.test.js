const TestHelpers = require("./testHelpers.js");
const MockGamepad = require("./mockGamepad/mockGamepad.js");
const XRGamepadComponent = require("../src/xrGamepadComponent.js");
const Constants = require("../src/constants.js");

const gamepadId = "mock3";
const handedness = "neutral";
let mockGamepad;

const mapping = Object.freeze(TestHelpers.getMappingById(gamepadId, handedness));

const testDescriptions = {
  "default": {
    dataSourceIds: ["button", "touchpad", "thumbstick", "dpadFromAxes", "dpadFromButtons"],
  },
  "button touched": {
    dataSourceIds: ["button", "thumbstick"],
    mockGamepadValues: { button: 0.4 }
  },
  "button pressed": {
    dataSourceIds: ["button", "thumbstick"],
    mockGamepadValues: { button: 1 }
  },

  "xAxis negative": {
    dataSourceIds: ["touchpad", "thumbstick", "dpadFromAxes"],
    mockGamepadValues: { xAxis: -0.4 },
    dataAsButtons: { left: 0.4 }
  },
  "xAxis positive": {
    dataSourceIds: ["touchpad", "thumbstick", "dpadFromAxes"],
    mockGamepadValues: { xAxis: 0.4 },
    dataAsButtons: { right: 0.4 } 
  },
  "yAxis negative": {
    dataSourceIds: ["touchpad", "thumbstick", "dpadFromAxes"],
    mockGamepadValues: { yAxis: -0.4 },
    dataAsButtons: { top: 0.4 }
  },
  "yAxis positive": {
    dataSourceIds: ["touchpad", "thumbstick", "dpadFromAxes"],
    mockGamepadValues: { yAxis: 0.4 },
    dataAsButtons: { bottom: 0.4 } 
  },

  "xAxis negative and yAxis positive": {
    dataSourceIds: ["touchpad", "thumbstick", "dpadFromAxes"],
    mockGamepadValues: { xAxis: -0.3, yAxis: 0.4 },
    dataAsButtons: { left: 0.3, bottom: 0.4 }
  },
  "xAxis positive and yAxis positive": {
    dataSourceIds: ["touchpad", "thumbstick", "dpadFromAxes"],
    mockGamepadValues: { xAxis: 0.3, yAxis: 0.4 },
    dataAsButtons: { right: 0.3, bottom: 0.4 }
  },
  "xAxis negative and yAxis negative": {
    dataSourceIds: ["touchpad", "thumbstick", "dpadFromAxes"],
    mockGamepadValues: { xAxis: -0.3, yAxis: -0.4 },
    dataAsButtons: { left: 0.3, top: 0.4 }
  },
  "xAxis positive and yAxis negative": {
    dataSourceIds: ["touchpad", "thumbstick", "dpadFromAxes"],
    mockGamepadValues: { xAxis: 0.3, yAxis: -0.4 },
    dataAsButtons: { right: 0.3, top: 0.4 }
  },
  
  "xAxis negative and button touched": {
    dataSourceIds: ["thumbstick"],
    mockGamepadValues: { xAxis: -0.4, button: 0.7 },
    dataAsButtons: { left: 0.4, button: 0.7 }
  },
  "xAxis positive and button pressed": {
    dataSourceIds: ["thumbstick"],
    mockGamepadValues: { xAxis: 0.4, button: 1 },
    dataAsButtons: { right: 0.4, button: 1 }
  },
  "xAxis negative and yAxis positive and button touched": {
    dataSourceIds: ["thumbstick"],
    mockGamepadValues: { xAxis: -0.3, yAxis: 0.4, button: 0.7 },
    dataAsButtons: { left: 0.3, bottom: 0.4, button: 0.7 }
  },
  "xAxis positive and yAxis negative and button pressed": {
    dataSourceIds: ["thumbstick"],
    mockGamepadValues: { xAxis: 0.3, yAxis: -0.4, button: 1 },
    dataAsButtons: { right: 0.3, top: 0.4, button: 1 }
  },
  
  "left touched": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { left: 0.4 }
  },
  "left pressed": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { left: 1 }
  },
  "right touched": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { right: 0.4 }
  },
  "right pressed": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { right: 1 }
  },
  "top touched": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { top: 0.4 }
  },
  "top pressed": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { top: 1 }
  },
  "bottom touched": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { bottom: 0.4 }
  },
  "bottom pressed": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { bottom: 1 }
  },

  "left and top touched": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { left: 0.3, top: 0.4 }
  },
  "right and top touched": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { right: 0.3, top: 0.4 }
  },
  "left and bottom touched": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { left: 0.3, bottom: 0.4 }
  },
  "right and bottom touched": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { right: 0.3, bottom: 0.4 }
  },

  "left and top pressed": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { left: 1, top: 1 }
  },
  "right and top pressed": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { right: 1, top: 1 }
  },
  "left and bottom pressed": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { left: 1, bottom: 1 }
  },
  "right and bottom pressed": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { right: 1, bottom: 1 }
  },

  "left touched and top pressed": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { left: 0.4, top: 1 }
  },
  "right touched and top pressed": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { right: 0.4, top: 1 }
  },
  "left touched and bottom pressed": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { left: 0.4, bottom: 1 }
  },
  "right touched and bottom pressed": {
    dataSourceIds: ["dpadFromButtons"],
    mockGamepadValues: { right: 0.4, bottom: 1 }
  }
};

const filterTests = function(dataSourceId) {
  return Object.entries(testDescriptions).filter((entry) => {
    if (entry[1].dataSourceIds.includes(dataSourceId)) {
      return true;
    }
  });
};

const testsTable = [
  ["button",          0, filterTests("button") ],
  ["touchpad",        1, filterTests("touchpad") ],
  ["thumbstick",      2, filterTests("thumbstick") ],
  ["dpadFromAxes",    3, filterTests("dpadFromAxes") ],
  ["dpadFromButtons", 4, filterTests("dpadFromButtons") ]
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
  });

  test("Get Component State", () => {
    let xrGamepadComponent = new XRGamepadComponent(componentIndex, mapping, mockGamepad);
    let componentState = xrGamepadComponent.getComponentState();
    expect(componentState).toEqual(Constants.ComponentState.DEFAULT);
  });

  test.each(dataTestsTable)(`GetData w/ %s`, (testName, {mockData, mockDataAsButtons=mockData}) => {
    let xrGamepadComponent = new XRGamepadComponent(componentIndex, mapping, mockGamepad);

    let expectedData = TestHelpers.makeData(xrGamepadComponent.dataSource, mockData);
    mockGamepad.mockComponents[dataSourceId].setValues(mockData);

    let actualData = xrGamepadComponent.getData();
    expect(actualData).toMatchObject(expectedData);

    const asButtons = true;
    expectedData = TestHelpers.makeData(xrGamepadComponent.dataSource, mockDataAsButtons, asButtons);
    actualData = xrGamepadComponent.getData(asButtons);
    expect(actualData).toMatchObject(expectedData);
  });

  test.each(dataTestsTable)("getWeightedVisualizations w/ %s", (testName, {mockData, mockDataAsButtons=mockData}) => {
    let xrGamepadComponent = new XRGamepadComponent(componentIndex, mapping, mockGamepad);

    mockGamepad.mockComponents[dataSourceId].setValues(
      TestHelpers.makeData(xrGamepadComponent.dataSource, mockData));
    
    const asButtons = true;
    let expectedData = TestHelpers.makeData(xrGamepadComponent.dataSource, mockDataAsButtons, asButtons);

    let actualVisualizations = xrGamepadComponent.getWeightedVisualizations();

    let visualResponseIndices = mapping.components[componentIndex].visualResponses;
    visualResponseIndices.forEach((visualResponseIndex) => {
      let visualResponse = mapping.visualResponses[visualResponseIndex];
      let actualVisualResponse = actualVisualizations[visualResponse.target];
      let expectedVisualResponse = visualResponse[expectedData.state];
      if (!expectedVisualResponse) {
        expect(actualVisualResponse).toBeUndefined();
      } else {
        expect(Object.keys(actualVisualResponse)).toHaveLength(Object.keys(expectedVisualResponse).length - 1);
        Object.keys(expectedVisualResponse).forEach((node) => {
          if (node != "degreesOfFreedom") {
            expect(actualVisualResponse[node].name).toEqual(expectedVisualResponse[node]);
            expect(actualVisualResponse[node].weight).toEqual(expectedData.buttons[node].value);
          }
        });
      }
    });
  });
});


const TestHelpers = require("./testHelpers.js");
const MockGamepad = require("./mockGamepad/mockGamepad.js");
const XRGamepadComponent = require("../src/xrGamepadComponent.js");
const Constants = require("../src/constants.js");

const gamepadId = "mock3";
const handedness = Constants.Handedness.NONE;
const mapping = Object.freeze(TestHelpers.getMappingById(gamepadId, handedness));
const mockGamepad = new MockGamepad(mapping, handedness);

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
  expect(mapping).not.toBeNull();

  const validator = TestHelpers.getValidator();
  const valid = validator(mapping);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

beforeEach(() => {
  mockGamepad.reset();
});

test("Constructor - invalid gamepad", () => {
  expect(() => {
    let xrGamepad = new XRGamepadComponent(null, mapping, 0);
  }).toThrow();
});

test("Constructor - invalid mapping", () => {
  expect(() => {
    let xrGamepad = new XRGamepadComponent(mockGamepad, null, 0);
  }).toThrow();
});

test("Constructor - invalid componentIndex", () => {
  expect(() => {
    let xrGamepad = new XRGamepadComponent(mockGamepad, mapping, -1);
  }).toThrow();

  expect(() => {
    let xrGamepad = new XRGamepadComponent(mockGamepad, mapping, 100);
  }).toThrow();
});

describe.each(testsTable)("xrGamepadComponent.%s", (dataSourceId, componentIndex, dataTestsTable) => {

  test("Create XRGamepadComponent", () => {
    let xrGamepadComponent = new XRGamepadComponent(mockGamepad, mapping, componentIndex);
    expect(xrGamepadComponent);
    expect(xrGamepadComponent.id).toEqual(dataSourceId);
  });

  test("Get Component State", () => {
    let xrGamepadComponent = new XRGamepadComponent(mockGamepad, mapping, componentIndex);
    let componentState = xrGamepadComponent.getComponentState();
    expect(componentState).toEqual(Constants.ComponentState.DEFAULT);
  });

  test.each(dataTestsTable)(`GetData w/ %s`, (testName, {mockData}) => {
    // Create the object to test
    let xrGamepadComponent = new XRGamepadComponent(mockGamepad, mapping, componentIndex);

    // Build the expected data object
    let expectedData = TestHelpers.makeData(xrGamepadComponent.dataSource, mockData);
    mockGamepad.mockComponents[dataSourceId].setValues(mockData);

    // Validate getData() returns the expected values
    let actualData = xrGamepadComponent.getData();
    expect(actualData).toMatchObject(expectedData);
  });

  test.each(dataTestsTable)(`GetData asButtons w/ %s`, (testName, {mockData, mockDataAsButtons=mockData}) => {
    const asButtons = true;
    
    // Create the object to test
    let xrGamepadComponent = new XRGamepadComponent(mockGamepad, mapping, componentIndex);

    // Set the mock gamepad to the values being tested
    let data = TestHelpers.makeData(xrGamepadComponent.dataSource, mockData);
    mockGamepad.mockComponents[dataSourceId].setValues(data);

    // Build the expected data object
    expectedData = TestHelpers.makeData(xrGamepadComponent.dataSource, mockDataAsButtons, asButtons);

    // Validate getData() returns the expected values
    actualData = xrGamepadComponent.getData(asButtons);
    expect(actualData).toMatchObject(expectedData);
  });

  test.each(dataTestsTable)("No visualResponse states w/ %s", (testName, {mockData}) => {
    // Remove all visualizations
    let modifiedMapping = TestHelpers.copyJsonObject(mapping);
    delete modifiedMapping.components[componentIndex].visualResponses;

    // Create the object to test
    let xrGamepadComponent = new XRGamepadComponent(mockGamepad, modifiedMapping, componentIndex);

    // Set the mock gamepad to the values being tested
    let data = TestHelpers.makeData(xrGamepadComponent.dataSource, mockData);
    mockGamepad.mockComponents[dataSourceId].setValues(data);
    
    // Get the weighted visualizations and ensure they do not exist
    let actualVisualizations = xrGamepadComponent.getWeightedVisualizations();
    expect(Object.keys(actualVisualizations)).toHaveLength(0);
  });

  test.each(dataTestsTable)("Only onTouch visualResponse state w/ %s", (testName, {mockData, mockDataAsButtons=mockData}) => {
    // Remove onPress visualizations
    let modifiedMapping = TestHelpers.copyJsonObject(mapping);
    modifiedMapping.components[componentIndex].visualResponses.forEach((visualResponseIndex) => {
      let visualResponse = modifiedMapping.visualResponses[visualResponseIndex];
      delete visualResponse.onPress;
    });

    // Create the object to test
    let xrGamepadComponent = new XRGamepadComponent(mockGamepad, mapping, componentIndex);

    // Set the mock gamepad to the values being tested
    let data = TestHelpers.makeData(xrGamepadComponent.dataSource, mockData);
    mockGamepad.mockComponents[dataSourceId].setValues(data);
    
    // Build the expected data object
    const asButtons = true;
    let expectedData = TestHelpers.makeData(xrGamepadComponent.dataSource, mockDataAsButtons, asButtons);
    if (expectedData.state == Constants.ComponentState.PRESSED) {
      expectedData.state = Constants.ComponentState.TOUCHED;
    }

    // Get the visualizations and validate them
    let actualVisualizations = xrGamepadComponent.getWeightedVisualizations();
    validateWeightedResponse(mapping, expectedData, actualVisualizations);
  });

  test.each(dataTestsTable)("Only onPress visualResponse state w/ %s", (testName, {mockData, mockDataAsButtons=mockData}) => {
    // Remove onPress visualizations
    let modifiedMapping = TestHelpers.copyJsonObject(mapping);
    modifiedMapping.components[componentIndex].visualResponses.forEach((visualResponseIndex) => {
      let visualResponse = modifiedMapping.visualResponses[visualResponseIndex];
      delete visualResponse.onTouch;
    });

    // Create the object to test
    let xrGamepadComponent = new XRGamepadComponent(mockGamepad, modifiedMapping, componentIndex);

    // Set the mock gamepad to the values being tested
    let data = TestHelpers.makeData(xrGamepadComponent.dataSource, mockData);
    mockGamepad.mockComponents[dataSourceId].setValues(data);
    
    // Build the expected data object
    const asButtons = true;
    let expectedData = TestHelpers.makeData(xrGamepadComponent.dataSource, mockDataAsButtons, asButtons);
    if (expectedData.state == Constants.ComponentState.TOUCHED) {
      expectedData.state = Constants.ComponentState.DEFAULT;
    }

    // Get the visualizations and validate them
    let actualVisualizations = xrGamepadComponent.getWeightedVisualizations();
    validateWeightedResponse(mapping, expectedData, actualVisualizations);
  });

  test.each(dataTestsTable)("Both visualResponse states w/ %s", (testName, {mockData, mockDataAsButtons=mockData}) => {
    // Create the object to test
    let xrGamepadComponent = new XRGamepadComponent(mockGamepad, mapping, componentIndex);

    // Set the mock gamepad to the values being tested
    let data = TestHelpers.makeData(xrGamepadComponent.dataSource, mockData);
    mockGamepad.mockComponents[dataSourceId].setValues(data);

    // Build the expected data object
    const asButtons = true;
    let expectedData = TestHelpers.makeData(xrGamepadComponent.dataSource, mockDataAsButtons, asButtons);

    // Get the visualizations and validate them
    let actualVisualizations = xrGamepadComponent.getWeightedVisualizations();
    validateWeightedResponse(mapping, expectedData, actualVisualizations);
  });

  function validateWeightedResponse(mapping, expectedData, actualVisualizations) {
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
  }

});


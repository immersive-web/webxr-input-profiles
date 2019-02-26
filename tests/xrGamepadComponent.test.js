const TestHelpers = require("./testHelpers.js");
const MockGamepad = require("./mockGamepad/mockGamepad.js");
const XRGamepad = require("../src/xrGamepad.js");
const XRGamepadComponent = require("../src/xrGamepadComponent.js");
const Constants = require("../src/constants.js");

const gamepadId = "mock3";
const handedness = Constants.Handedness.NONE;
const mapping = Object.freeze(XRGamepad.getMapping(gamepadId, Constants.MappingType.MOCK));
const mockGamepad = new MockGamepad(mapping, handedness);
const asButtons = true;

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
    expectedDataAsButtons: { left: 0.4 }
  },
  "xAxis positive": {
    dataSourceIds: ["touchpad", "thumbstick", "dpadFromAxes"],
    mockGamepadValues: { xAxis: 0.4 },
    expectedDataAsButtons: { right: 0.4 } 
  },
  "yAxis negative": {
    dataSourceIds: ["touchpad", "thumbstick", "dpadFromAxes"],
    mockGamepadValues: { yAxis: -0.4 },
    expectedDataAsButtons: { top: 0.4 }
  },
  "yAxis positive": {
    dataSourceIds: ["touchpad", "thumbstick", "dpadFromAxes"],
    mockGamepadValues: { yAxis: 0.4 },
    expectedDataAsButtons: { bottom: 0.4 } 
  },

  "xAxis negative and yAxis positive": {
    dataSourceIds: ["touchpad", "thumbstick", "dpadFromAxes"],
    mockGamepadValues: { xAxis: -0.3, yAxis: 0.4 },
    expectedDataAsButtons: { left: 0.3, bottom: 0.4 }
  },
  "xAxis positive and yAxis positive": {
    dataSourceIds: ["touchpad", "thumbstick", "dpadFromAxes"],
    mockGamepadValues: { xAxis: 0.3, yAxis: 0.4 },
    expectedDataAsButtons: { right: 0.3, bottom: 0.4 }
  },
  "xAxis negative and yAxis negative": {
    dataSourceIds: ["touchpad", "thumbstick", "dpadFromAxes"],
    mockGamepadValues: { xAxis: -0.3, yAxis: -0.4 },
    expectedDataAsButtons: { left: 0.3, top: 0.4 }
  },
  "xAxis positive and yAxis negative": {
    dataSourceIds: ["touchpad", "thumbstick", "dpadFromAxes"],
    mockGamepadValues: { xAxis: 0.3, yAxis: -0.4 },
    expectedDataAsButtons: { right: 0.3, top: 0.4 }
  },
  
  "xAxis negative and button touched": {
    dataSourceIds: ["thumbstick"],
    mockGamepadValues: { xAxis: -0.4, button: 0.7 },
    expectedDataAsButtons: { left: 0.4, button: 0.7 }
  },
  "xAxis positive and button pressed": {
    dataSourceIds: ["thumbstick"],
    mockGamepadValues: { xAxis: 0.4, button: 1 },
    expectedDataAsButtons: { right: 0.4, button: 1 }
  },
  "xAxis negative and yAxis positive and button touched": {
    dataSourceIds: ["thumbstick"],
    mockGamepadValues: { xAxis: -0.3, yAxis: 0.4, button: 0.7 },
    expectedDataAsButtons: { left: 0.3, bottom: 0.4, button: 0.7 }
  },
  "xAxis positive and yAxis negative and button pressed": {
    dataSourceIds: ["thumbstick"],
    mockGamepadValues: { xAxis: 0.3, yAxis: -0.4, button: 1 },
    expectedDataAsButtons: { right: 0.3, top: 0.4, button: 1 }
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
  },

  "xAxis negative on inverted yAxis": {
    dataSourceIds: ["invertedTouchpad"],
    mockGamepadValues: { xAxis: -0.4 },
    expectedData: { xAxis: -0.4 },
    expectedDataAsButtons: { left: 0.4 }
  },
  "xAxis positive on inverted yAxis": {
    dataSourceIds: ["invertedTouchpad"],
    mockGamepadValues: { xAxis: 0.4 },
    expectedData: { xAxis: 0.4 },
    expectedDataAsButtons: { right: 0.4 } 
  },
  "yAxis negative on inverted yAxis": {
    dataSourceIds: ["invertedTouchpad"],
    mockGamepadValues: { yAxis: -0.4 },
    expectedData: { yAxis: 0.4 },
    expectedDataAsButtons: { bottom: 0.4 }
  },
  "yAxis positive on inverted yAxis": {
    dataSourceIds: ["invertedTouchpad"],
    mockGamepadValues: { yAxis: 0.4 },
    expectedData: { yAxis: -0.4 },
    expectedDataAsButtons: { top: 0.4 } 
  }
};

/**
 * Builds a table of tests for the provided componentIndex by filtering relevant
 * tests out of the full testDescriptions table
 * @param {number} componentIndex - The index of the component to be tested
 * @returns {Object} Describes the complete set of tests for the provided 
 * componentIndex
 */
const filterTests = function(componentIndex) {
  let component = mapping.components[componentIndex];
  let dataSource = mapping.dataSources[component.dataSource];

  // Look through tests to find ones applicable to the provided componentIndex
  let filteredTests = [];
  Object.keys(testDescriptions).forEach((key) => {
    let testDescription = testDescriptions[key];

    // If the test matches, build a test data description
    if (testDescription.dataSourceIds.includes(dataSource.id)) {
      // Fill in the mockGamepadValues
      testData = {
        mockGamepadValues: TestHelpers.makeData(dataSource, testDescription.mockGamepadValues)
      };

      // Fill in the expectedData when not requested as buttons
      if (testDescription.expectedData) {
        testData.expectedData = TestHelpers.makeData(dataSource, testDescription.expectedData);
      } else {
        testData.expectedData = testData.mockGamepadValues;
      }

      // Fill in the expected data when requested as buttons
      if (testDescription.expectedDataAsButtons) {
        testData.expectedDataAsButtons = TestHelpers.makeData(dataSource, testDescription.expectedDataAsButtons, asButtons);
      } else if (testDescription.expectedData) {
        testData.expectedDataAsButtons = TestHelpers.makeData(dataSource, testDescription.expectedData, asButtons);
      } else {
        testData.expectedDataAsButtons = TestHelpers.makeData(dataSource, testDescription.mockGamepadValues, asButtons);
      }

      // Add the test to the component's test list
      filteredTests.push([key, testData]);
    }
  });

  return [dataSource.id, componentIndex, filteredTests];
};

// The comprehensive list of tests for all components
const testsTable = [
  filterTests(0),
  filterTests(1),
  filterTests(2),
  filterTests(3),
  filterTests(4),
  filterTests(5)
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

  test.each(dataTestsTable)(`GetData w/ %s`, (testName, {mockGamepadValues, expectedData}) => {
    // Create the object to test
    let xrGamepadComponent = new XRGamepadComponent(mockGamepad, mapping, componentIndex);

    // Set the mock gamepad to the values being tested
    mockGamepad.mockComponents[dataSourceId].setValues(mockGamepadValues);

    // Validate getData() returns the expected values
    let actualData = xrGamepadComponent.getData();
    expect(actualData).toMatchObject(expectedData);
  });

  test.each(dataTestsTable)(`GetData asButtons w/ %s`, (testName, {mockGamepadValues, expectedDataAsButtons}) => {
    // Create the object to test
    let xrGamepadComponent = new XRGamepadComponent(mockGamepad, mapping, componentIndex);

    // Set the mock gamepad to the values being tested
    mockGamepad.mockComponents[dataSourceId].setValues(mockGamepadValues);

    // Validate getData() returns the expected values
    let actualData = xrGamepadComponent.getData(asButtons);
    expect(actualData).toMatchObject(expectedDataAsButtons);
  });

  test.each(dataTestsTable)("No visualResponse states w/ %s", (testName, {mockGamepadValues}) => {
    // Remove all visualizations
    let modifiedMapping = TestHelpers.copyJsonObject(mapping);
    delete modifiedMapping.components[componentIndex].visualResponses;

    // Create the object to test
    let xrGamepadComponent = new XRGamepadComponent(mockGamepad, modifiedMapping, componentIndex);

    // Set the mock gamepad to the values being tested
    mockGamepad.mockComponents[dataSourceId].setValues(mockGamepadValues);
    
    // Get the weighted visualizations and ensure they do not exist
    let actualVisualizations = xrGamepadComponent.getWeightedVisualizations();
    expect(Object.keys(actualVisualizations)).toHaveLength(0);
  });

  test.each(dataTestsTable)("Only onTouch visualResponse state w/ %s", (testName, {mockGamepadValues, expectedDataAsButtons}) => {
    // Remove onPress visualizations
    let modifiedMapping = TestHelpers.copyJsonObject(mapping);
    modifiedMapping.components[componentIndex].visualResponses.forEach((visualResponseIndex) => {
      let visualResponse = modifiedMapping.visualResponses[visualResponseIndex];
      delete visualResponse.onPress;
    });

    // Update the expected data state to reflect the lack of onPress visualization
    let modifiedExpectedData = TestHelpers.copyJsonObject(expectedDataAsButtons)
    if (modifiedExpectedData.state == Constants.ComponentState.PRESSED) {
      modifiedExpectedData.state = Constants.ComponentState.TOUCHED;
    }

    // Create the object to test
    let xrGamepadComponent = new XRGamepadComponent(mockGamepad, modifiedMapping, componentIndex);

    // Set the mock gamepad to the values being tested
    mockGamepad.mockComponents[dataSourceId].setValues(mockGamepadValues);

    // Get the visualizations and validate them
    let actualVisualizations = xrGamepadComponent.getWeightedVisualizations();
    validateWeightedResponse(mapping, modifiedExpectedData, actualVisualizations);
  });

  test.each(dataTestsTable)("Only onPress visualResponse state w/ %s", (testName, {mockGamepadValues, expectedDataAsButtons}) => {
    // Remove onPress visualizations
    let modifiedMapping = TestHelpers.copyJsonObject(mapping);
    modifiedMapping.components[componentIndex].visualResponses.forEach((visualResponseIndex) => {
      let visualResponse = modifiedMapping.visualResponses[visualResponseIndex];
      delete visualResponse.onTouch;
    });

    // Update the expected data state to reflect the lack of onPress visualization
    let modifiedExpectedData = TestHelpers.copyJsonObject(expectedDataAsButtons)
    if (modifiedExpectedData.state == Constants.ComponentState.TOUCHED) {
      modifiedExpectedData.state = Constants.ComponentState.DEFAULT;
    }

    // Create the object to test
    let xrGamepadComponent = new XRGamepadComponent(mockGamepad, modifiedMapping, componentIndex);

    // Set the mock gamepad to the values being tested
    mockGamepad.mockComponents[dataSourceId].setValues(mockGamepadValues);
    
    // Get the visualizations and validate them
    let actualVisualizations = xrGamepadComponent.getWeightedVisualizations();
    validateWeightedResponse(mapping, modifiedExpectedData, actualVisualizations);
  });

  test.each(dataTestsTable)("Both visualResponse states w/ %s", (testName, {mockGamepadValues, expectedDataAsButtons}) => {
    // Create the object to test
    let xrGamepadComponent = new XRGamepadComponent(mockGamepad, mapping, componentIndex);

    // Set the mock gamepad to the values being tested
    mockGamepad.mockComponents[dataSourceId].setValues(mockGamepadValues);

    // Get the visualizations and validate them
    let actualVisualizations = xrGamepadComponent.getWeightedVisualizations();
    validateWeightedResponse(mapping, expectedDataAsButtons, actualVisualizations);
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
        expect(actualVisualResponse).toBeDefined();
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


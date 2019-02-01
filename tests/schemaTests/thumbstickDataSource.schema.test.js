const testHelpers = require("./testHelpers.js");
const thumbstickSourceIndex = 2;

test("swap for touchpad", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let valid = testHelpers.validator(mapping);
  let dataSource = mapping.gamepad.dataSources[thumbstickSourceIndex];
  dataSource.dataSourceType = "touchpadSource";
  if (!valid) {
    expect(testHelpers.validator.errors).toBeNull();
  }
});

test("invalid id", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[thumbstickSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource,
    "property": "id",
    "expectedType": "string"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid dataSourceType", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[thumbstickSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource,
    "property": "dataSourceType"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid additional data source properties", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[thumbstickSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource,
    "property": "someNonsense",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid button", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[thumbstickSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource,
    "property": "button",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid xAxis", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[thumbstickSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource,
    "property": "xAxis"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid yAxis", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[thumbstickSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource,
    "property": "yAxis"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid xAxis.gamepadAxesIndex", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[thumbstickSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource.xAxis,
    "property": "gamepadAxesIndex",
    "expectedType": "number"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid yAxis.gamepadAxesIndex", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[thumbstickSourceIndex];

  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource.yAxis,
    "property": "gamepadAxesIndex",
    "expectedType": "number"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid additional xAxis properties", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[thumbstickSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource.xAxis,
    "property": "someNonsense",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid additional yAxis properties", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[thumbstickSourceIndex];
  checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource.yAxis,
    "property": "someNonsense",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});
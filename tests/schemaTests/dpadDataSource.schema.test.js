const testHelpers = require("./testHelpers.js");
const dpadSourceIndex = 1;

test("invalid id", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[dpadSourceIndex];
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
  let dataSource = mapping.gamepad.dataSources[dpadSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource,
    "property": "dataSourceType"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid left button", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[dpadSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource,
    "property": "left"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid right button", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[dpadSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource,
    "property": "right"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid down button", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[dpadSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource,
    "property": "down"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid up button", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[dpadSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource,
    "property": "up"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid additional data source properties", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[dpadSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource,
    "property": "someNonsense",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});
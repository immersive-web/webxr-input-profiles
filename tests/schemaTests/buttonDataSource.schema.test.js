const testHelpers = require("./testHelpers.js");
const buttonSourceIndex = 0;

test("invalid id", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[buttonSourceIndex];
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
  let dataSource = mapping.gamepad.dataSources[buttonSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource,
    "property": "dataSourceType"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid additional data source properties", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[buttonSourceIndex];
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
  let dataSource = mapping.gamepad.dataSources[buttonSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource,
    "property": "button"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid buttonSource.gamepadButtonsIndex", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[buttonSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource.button,
    "property": "gamepadButtonsIndex",
    "expectedType": "number"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid additional properties", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[buttonSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource.button,
    "property": "someNonsense",
    "undefinedAllowed": "true"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid button.supportsTouch", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[buttonSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource.button,
    "property": "supportsTouch",
    "expectedType": "boolean",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid button.supportsPress", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[buttonSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource.button,
    "property": "supportsPress",
    "expectedType": "boolean",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid button.analogValues", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[buttonSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource.button,
    "property": "analogValues",
    "expectedType": "boolean",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid additional buttonSource properties", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let dataSource = mapping.gamepad.dataSources[buttonSourceIndex];
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": dataSource.button,
    "property": "someNonsense",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});
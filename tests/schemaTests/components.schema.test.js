const testHelpers = require("./testHelpers.js");

test("component exists", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  expect(mapping.gamepad.components[0]).toBeDefined();
});

test("no valid dataSource", () => {
  let mapping = testHelpers.getSmallestValidMapping();

  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad.components[0],
    "property": "dataSource",
    "expectedType": "number"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("no valid root", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad.components[0],
    "property": "root",
    "expectedType": "string"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("no valid label transform", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad.components[0],
    "property": "labelTransform",
    "expectedType": "string"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("no valid pressResponse", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad.components[0],
    "property": "pressResponse",
    "expectedType": "number",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("no valid touchResponse", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad.components[0],
    "property": "touchResponse",
    "expectedType": "number",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("additional properties", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad.components[0],
    "property": "someNonsense",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("duplicates", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let component = mapping.gamepad.components[0];

  mapping.gamepad.components.push(component);
  expect(testHelpers.validator(mapping)).toBe(false);
});
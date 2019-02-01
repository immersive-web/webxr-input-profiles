const mappingDescriptions = require("../../src/mappingDescriptions.js");
const testHelpers = require("./testHelpers.js");

test("smallest valid mapping", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let valid = testHelpers.validator(mapping);
  if (!valid) {
    expect(testHelpers.validator.errors).toBeNull();
  }
});

test("empty mapping", () => {
  let mapping = {};
  expect(testHelpers.validator(mapping)).toBe(false);
});

test("invalid version", () => {
  const mapping = testHelpers.getSmallestValidMapping();

  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping,
    "property": "version",
    "expectedType": "string"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid gamepad", () => {
  const mapping = testHelpers.getSmallestValidMapping();

  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping,
    "property": "gamepad"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid hands", () => {
  const mapping = testHelpers.getSmallestValidMapping();

  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad,
    "property": "hands"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid components", () => {
  const mapping = testHelpers.getSmallestValidMapping();

  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad,
    "property": "components"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid dataSources", () => {
  const mapping = testHelpers.getSmallestValidMapping();

  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad,
    "property": "dataSources"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid responses", () => {
  const mapping = testHelpers.getSmallestValidMapping();

  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad,
    "property": "responses",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("gets all mapping descriptions", () => {
  const mappingList = mappingDescriptions.getList();
  expect(mappingList).toBeDefined();
  expect(Object.keys(mappingList).length).toBe(6);
});

test("validates all mappings", () => {
  const mappingList = mappingDescriptions.getList();
  mappingList.forEach( (mappingId) => {
    let mapping = mappingDescriptions.getMappingById(mappingId);
    expect(mapping).not.toBeNull();
    let valid = testHelpers.validator(mapping);
    if (!valid) {
      expect(testHelpers.validator.errors).toBeNull();
    }
  });
});
const testHelpers = require("../testHelpers.js");
const validator = testHelpers.getValidator();
const validMapping = Object.freeze(testHelpers.getMappingById("mock1", true));

test("Valid mapping", () => {
  let valid = false;
  let mapping = Object.assign({}, validMapping);
  
  valid = validator(mapping);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  const visualResponse = {
    "userAction": "onTouch",
    "target": "target node",
    "buttonMin": "buttonMin node",
    "buttonMax": "buttonMax node"
  };
  mapping.visualResponses = [visualResponse];
  valid = validator(mapping);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test("Invalid missing version", () => {
  let mapping = Object.assign({}, validMapping);
  delete mapping.version;
  expect(validator(mapping)).toBe(false);
});

test("Invalid missing id", () => {
  let mapping = Object.assign({}, validMapping);
  delete mapping.id;
  expect(validator(mapping)).toBe(false);
});

test("Invalid missing hands", () => {
  let mapping = Object.assign({}, validMapping);
  delete mapping.hands;
  expect(validator(mapping)).toBe(false);
});

test("Invalid missing components", () => {
  let mapping = Object.assign({}, validMapping);
  delete mapping.components;
  expect(validator(mapping)).toBe(false);
});

test("Invalid missing dataSources", () => {
  let mapping = Object.assign({}, validMapping);
  delete mapping.dataSources;
  expect(validator(mapping)).toBe(false);
});
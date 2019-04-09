const TestHelpers = require("../testHelpers.js");
const validator = TestHelpers.getValidator();
import { Constants } from "../../src/constants.js";
const validMapping = Object.freeze(TestHelpers.getMapping("mock1", Constants.MappingType.MOCK));

test("Valid mapping", () => {
  let valid = false;
  let mapping = TestHelpers.copyJsonObject(validMapping);
  
  valid = validator(mapping);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  const visualResponse = {
    "target": "target node",
    "onTouch": {
      "degreesOfFreedom": 1,
      "button": "button node"
    }
  };
  mapping.visualResponses = [visualResponse];
  valid = validator(mapping);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test("Invalid missing version", () => {
  let mapping = TestHelpers.copyJsonObject(validMapping);
  delete mapping.version;
  expect(validator(mapping)).toBe(false);
});

test("Invalid missing id", () => {
  let mapping = TestHelpers.copyJsonObject(validMapping);
  delete mapping.id;
  expect(validator(mapping)).toBe(false);
});

test("Invalid missing handedness", () => {
  let mapping = TestHelpers.copyJsonObject(validMapping);
  delete mapping.handedness;
  expect(validator(mapping)).toBe(false);
});

test("Invalid missing components", () => {
  let mapping = TestHelpers.copyJsonObject(validMapping);
  delete mapping.components;
  expect(validator(mapping)).toBe(false);
});

test("Invalid missing dataSources", () => {
  let mapping = TestHelpers.copyJsonObject(validMapping);
  delete mapping.dataSources;
  expect(validator(mapping)).toBe(false);
});
const testHelpers = require("../testHelpers.js");
const validator = testHelpers.getValidator();
const validMapping = Object.freeze({
  version: "0.1.0",
  gamepad: {
    hands: {
      neutral: {
        asset: "asset name",
        root: "root name",
        components: [0]
      }
    },
    components: [
      {
        dataSource: 0,
        root: "component root name",
        labelTransform: "label transform name"
      }
    ],
    dataSources: [
      {
        id: "a button",
        dataSourceType: "buttonSource",
        buttonIndex: 0
      }
    ]
  }
});

test("Valid mapping", () => {
  let valid = false;
  let mapping = Object.assign({}, validMapping);
  
  valid = validator(mapping);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  const visualResponse = {
    "type": "onTouch",
    "target": "target node",
    "buttonMax": "buttonMax node"
  };
  mapping.gamepad.visualResponses = [visualResponse];
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

test("Invalid missing gamepad", () => {
  let mapping = Object.assign({}, validMapping);
  delete mapping.gamepad;
  expect(validator(mapping)).toBe(false);
});

test("Invalid missing hands", () => {
  let mapping = Object.assign({}, validMapping);
  delete mapping.gamepad.hands;
  expect(validator(mapping)).toBe(false);
});

test("Invalid missing components", () => {
  let mapping = Object.assign({}, validMapping);
  delete mapping.gamepad.components;
  expect(validator(mapping)).toBe(false);
});

test("Invalid missing dataSources", () => {
  let mapping = Object.assign({}, validMapping);
  delete mapping.gamepad.dataSources;
  expect(validator(mapping)).toBe(false);
});
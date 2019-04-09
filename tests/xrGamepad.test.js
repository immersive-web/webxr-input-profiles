const TestHelpers = require("./testHelpers.js");
import { Constants } from "../src/constants.js";
import { XRGamepad } from "../src/xrGamepad.js";
import { MockGamepad } from "../src/mockGamepad/mockGamepad.js";

const validGamepadId = "mock3";
const validHandedness = Constants.Handedness.NONE;
const validMapping = Object.freeze(TestHelpers.getMapping(validGamepadId, Constants.MappingType.MOCK));
const validGamepad = new MockGamepad(validMapping, validHandedness);

test("Constructor - invalid gamepad", () => {
  expect(() => {
    let xrGamepad = new XRGamepad(null, validMapping, validHandedness);
    expect(xrGamepad).toBeUndefined();
  }).toThrow();
});

test("Constructor - invalid mapping", () => {
  expect(() => {
    let xrGamepad = new XRGamepad(validGamepad, null, validHandedness);
    expect(xrGamepad).toBeUndefined();
  }).toThrow();
});

test("Constructor - invalid handedness", () => {
  expect(() => {
    let xrGamepad = new XRGamepad(validGamepad, validMapping, "SOME_NONSENSE");
    expect(xrGamepad).toBeUndefined();
  }).toThrow();
  
  expect(() => {
    let xrGamepad = new XRGamepad(validGamepad, validMapping, Constants.Handedness.LEFT);
    expect(xrGamepad).toBeUndefined();
  }).toThrow();
});

test("Constructor - valid handedness variations", () => {
  let xrGamepad = new XRGamepad(validGamepad, validMapping, "");
  expect(xrGamepad).toBeDefined();

  xrGamepad = new XRGamepad(validGamepad, validMapping, null);
  expect(xrGamepad).toBeDefined();

  xrGamepad = new XRGamepad(validGamepad, validMapping);
  expect(xrGamepad).toBeDefined();
});

test("Constructor - mismatched ids", () => {
  let modifiedMapping = TestHelpers.copyJsonObject(validMapping);
  modifiedMapping.id = "SOME NONSENSE";

  expect(() => {
    let xrGamepad = new XRGamepad(validGamepad, modifiedMapping, validHandedness);
    expect(xrGamepad).toBeUndefined();
  }).toThrow();
});

const testsTable = [];
TestHelpers.getMappingsList().forEach((entry) => {
  Object.keys(entry.mapping.handedness).forEach((handedness) => {
    const testName = `${entry.testName}.${handedness}`;
    testsTable.push([ testName, { handedness: handedness, mapping: entry.mapping }]);
  });
});

describe.each(testsTable)("xrGamepad.%s", (testName, {handedness, mapping}) => {

  test("Create an XRGamepad", () => {
    let mockGamepad = new MockGamepad(mapping, handedness);
    expect(mockGamepad).toBeDefined();
    
    let xrGamepad = new XRGamepad(mockGamepad, mapping, handedness);
    expect(xrGamepad);
  });

});

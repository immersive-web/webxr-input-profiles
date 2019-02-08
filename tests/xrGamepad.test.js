const TestHelpers = require("./testHelpers.js");
const MockGamepad = require("./mockGamepad/mockGamepad.js");
const Constants = require("../src/constants.js");
const XRGamepad = require("../src/xrGamepad.js");

const validGamepadId = "mock3";
const validHandedness = Constants.Handedness.NONE;
const validMapping = Object.freeze(TestHelpers.getMappingById(validGamepadId, Constants.MappingType.MOCK));
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

const createTestTable = function(mappingType) {
  const testTable = [];

  const mappingList = TestHelpers.getMappingsList(mappingType);
  mappingList.forEach((gamepadId) => {
    let mapping = TestHelpers.getMappingById(gamepadId, mappingType);
    Object.keys(mapping.handedness).forEach((handednessKey) => {
      testTable.push([gamepadId, handednessKey, mapping]);
    });
  });

  return testTable;
}

const testTable = [
  ...createTestTable(Constants.MappingType.WEBXR),
  ...createTestTable(Constants.MappingType.WEBVR),
  ...createTestTable(Constants.MappingType.MOCK)
];

describe.each(testTable)("xrGamepad.%s.%s", (gamepadId, handedness, mapping) => {

  test("Create an XRGamepad", () => {
    let mockGamepad = new MockGamepad(mapping, handedness);
    expect(mockGamepad).toBeDefined();
    
    let xrGamepad = new XRGamepad(mockGamepad, mapping, handedness);
    expect(xrGamepad);
  });

});

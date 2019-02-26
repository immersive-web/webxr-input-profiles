const TestHelpers = require("./testHelpers.js");
const MockGamepad = require("./mockGamepad/mockGamepad.js");
const Constants = require("../src/constants.js");
const XRGamepad = require("../src/xrGamepad.js");

let testTable = [];
const mappingList = TestHelpers.getMappingsList();
mappingList.forEach((gamepadId) => {
  let mapping = TestHelpers.getMappingById(gamepadId);
  Object.keys(mapping.handedness).forEach((handedness) => {
    testTable.push([gamepadId, handedness, mapping]);
  });
});

const constructorOptions = {
  gamepadId: "mock3",
  handedness: Constants.Handedness.NONE
};
constructorOptions.mapping = TestHelpers.getMappingById(constructorOptions.gamepadId, constructorOptions.handedness);
constructorOptions.mockGamepad = new MockGamepad(constructorOptions.mapping, constructorOptions.handedness);

test("Constructor - invalid gamepad", () => {
  const {mapping, handedness} = constructorOptions;
  expect(() => {
    let xrGamepad = new XRGamepad(null, mapping, handedness);
  }).toThrow();
});

test("Constructor - invalid mapping", () => {
  const {mockGamepad, handedness} = constructorOptions;
  expect(() => {
    let xrGamepad = new XRGamepad(mockGamepad, null, handedness);
  }).toThrow();
});

test("Constructor - invalid handedness", () => {
  const {mockGamepad, mapping} = constructorOptions;

  expect(() => {
    let xrGamepad = new XRGamepad(mockGamepad, mapping, "SOME_NONSENSE");
  }).toThrow();
  
  expect(() => {
    let xrGamepad = new XRGamepad(mockGamepad, mapping, Constants.Handedness.LEFT);
  }).toThrow();
});

test("Constructor - valid handedness variations", () => {
  const {mockGamepad, mapping} = constructorOptions;

  let xrGamepad = new XRGamepad(mockGamepad, mapping, "");
  expect(xrGamepad).toBeDefined();

  xrGamepad = new XRGamepad(mockGamepad, mapping, null);
  expect(xrGamepad).toBeDefined();

  xrGamepad = new XRGamepad(mockGamepad, mapping);
  expect(xrGamepad).toBeDefined();
});

test("Constructor - mismatched ids", () => {
  const {mockGamepad, mapping, handedness} = constructorOptions;
  let modifiedMapping = TestHelpers.copyJsonObject(mapping);
  modifiedMapping.id = "SOME NONSENSE";

  expect(() => {
    let xrGamepad = new XRGamepad(mockGamepad, modifiedMapping, handedness);
  }).toThrow();
});

describe.each(testTable)("xrGamepad.%s.%s", (gamepadId, handedness, mapping) => {

  test("Create an XRGamepad", () => {
    let mockGamepad = new MockGamepad(mapping, handedness);
    expect(mockGamepad).toBeDefined();
    
    let xrGamepad = new XRGamepad(mockGamepad, mapping, handedness);
    expect(xrGamepad);
  });

});

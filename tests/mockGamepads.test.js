const TestHelpers = require("./testHelpers.js");
const Constants = require("../src/constants.js");
const MockGamepad = require("./mockGamepad/mockGamepad.js");

const createTestTable = function(mappingType) {
  let testTable = [];

  const mappingList = TestHelpers.getMappingsList(mappingType);
  mappingList.forEach((gamepadId) => {
    let mapping = TestHelpers.getMappingById(gamepadId, mappingType);
    Object.keys(mapping.handedness).forEach((handedness) => {
      testTable.push([gamepadId, handedness, mapping]);
    });
  });

  return testTable;
}

const testsTable = [
  ...createTestTable(Constants.MappingType.WEBXR),
  ...createTestTable(Constants.MappingType.WEBVR),
  ...createTestTable(Constants.MappingType.MOCK)
];

test.each(testsTable)("mockGamepad.%s.%s", (gamepadId, handedness, mapping) => {
  let mockGamepad = new MockGamepad(mapping, handedness);
  expect(mockGamepad).toBeDefined();
});

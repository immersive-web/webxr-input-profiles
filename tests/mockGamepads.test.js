const TestHelpers = require("./testHelpers.js");
const MockGamepad = require("./mockGamepad/mockGamepad.js");

let testTable = [];
const mappingList = TestHelpers.getMappingsList();
mappingList.forEach((gamepadId) => {
  let mapping = TestHelpers.getMappingById(gamepadId);
  Object.keys(mapping.handedness).forEach((handedness) => {
    testTable.push([gamepadId, handedness, mapping]);
  });
});

test.each(testTable)("mockGamepad.%s.%s", (gamepadId, handedness, mapping) => {
  let mockGamepad = new MockGamepad(mapping, handedness);
  expect(mockGamepad).toBeDefined();
});

const TestHelpers = require("./testHelpers.js");
const MockGamepad = require("./mockGamepad/mockGamepad.js");

const testsTable = [];
TestHelpers.getMappingsList().forEach((entry) => {
  Object.keys(entry.mapping.handedness).forEach((handedness) => {
    const testName = `${entry.testName}.${handedness}`;
    testsTable.push([ testName, { handedness: handedness, mapping: entry.mapping }]);
  });
});

test.each(testsTable)("mockGamepad.%s", (testName, {handedness, mapping}) => {
  let mockGamepad = new MockGamepad(mapping, handedness);
  expect(mockGamepad).toBeDefined();
});

const MappingDescriptions = require("../src/mappingDescriptions.js");
const mappingList = MappingDescriptions.getList();

let testTable = [];
mappingList.forEach((gamepadId) => {
  const mapping = MappingDescriptions.getMappingById(gamepadId);
  Object.keys(mapping.hands).forEach((handedness) => {
    testTable.push([gamepadId, handedness]);
  });
});

const MockGamepad = require("./mocks/mockGamepad.js");

test.each(testTable)("mockGamepad.%s.%s", (gamepadId, handedness) => {
  let mockGamepad = new MockGamepad(gamepadId, handedness);
  expect(mockGamepad).toBeDefined();
});

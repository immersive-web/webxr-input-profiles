const TestHelpers = require("./testHelpers.js");
const MockGamepad = require("./mockGamepad/mockGamepad.js");
const XRGamepad = require("../src/xrGamepad.js");

let testTable = [];
const mappingList = TestHelpers.getMappingsList();
mappingList.forEach((gamepadId) => {
  let mapping = TestHelpers.getMappingById(gamepadId);
  Object.keys(mapping.hands).forEach((handedness) => {
    testTable.push([gamepadId, handedness, mapping]);
  });
});

describe.each(testTable)("xrGamepad.%s.%s", (gamepadId, handedness, mapping) => {

  test("Create an XRGamepad", () => {
    let mockGamepad = new MockGamepad(mapping, handedness);
    expect(mockGamepad).toBeDefined();
    
    let xrGamepad = new XRGamepad(mockGamepad, handedness, mapping);
    expect(xrGamepad);
  });

});

const testHelpers = require("../testHelpers.js");
const validator = testHelpers.getValidator();

test("gets all mapping descriptions", () => {
  const mappingDescriptions = require("../../src/mappingDescriptions.js");
  const mappingList = mappingDescriptions.getList();
  expect(mappingList).toBeDefined();
  expect(Object.keys(mappingList).length).toBe(6);
});

test("validates all mappings", () => {
  const mappingDescriptions = require("../../src/mappingDescriptions.js");
  const mappingList = mappingDescriptions.getList();
  mappingList.forEach( (mappingId) => {
    let mapping = mappingDescriptions.getMappingById(mappingId);
    expect(mapping).not.toBeNull();
    let valid = validator(mapping);
    if (!valid) {
      expect(validator.errors).toBeNull();
    }
  });
});
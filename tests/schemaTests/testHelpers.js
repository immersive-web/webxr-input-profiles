const mappingDescriptions = require("../../src/mappingDescriptions.js");
const validator = mappingDescriptions.getSchemaValidator();
const fs = require("fs");
const { join } = require('path');
const fileContent = fs.readFileSync(join(__dirname, "smallestValidMapping.json"));

module.exports = {
  validator: validator,

  getSmallestValidMapping: function () {
    return JSON.parse(fileContent);
  },
  
  checkProperty: function (args){
    const {mapping, object, property, expectedType, undefinedAllowed} = args;

    if (expectedType != "boolean") {
      object[property] = true;
      expect(validator(mapping)).toBe(false);
    }

    if (expectedType != "string") {
      object[property] = "should not be a string";
      expect(validator(mapping)).toBe(false);
    }

    if (expectedType != "number") {
      object[property] = 42;
      expect(validator(mapping)).toBe(false);
    }

    if (expectedType != "emptyObject") {
      object[property] = {};
      expect(validator(mapping)).toBe(false);
    }

    if (expectedType != "emptyArray") {
      object[property] = [];
      expect(validator(mapping)).toBe(false);
    }

    if (!undefinedAllowed) {
      delete object[property];
      expect(validator(mapping)).toBe(false);
    }
  }
};

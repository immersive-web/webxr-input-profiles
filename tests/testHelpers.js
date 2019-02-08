module.exports = {
  getValidator: function (schema, dependencies) {
    if (!schema) {
      const mappingDescriptions = require("../src/mappingDescriptions.js");
      return mappingDescriptions.getSchemaValidator();
    } else {
      const { join } = require('path');
      const schemasFolder = join(__dirname, "../schemas/");
      const Ajv = require('ajv');
      const ajv = new Ajv({schemaId: 'id'});
      ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
      if (dependencies) {
        dependencies.forEach((dependency) => {
          ajv.addMetaSchema(require(join(schemasFolder, dependency)));
        })
      }
      return ajv.compile(require(join(schemasFolder, schema)));
    }
  }
};
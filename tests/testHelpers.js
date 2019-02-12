const { join } = require('path');
const mappingsFolder = join(__dirname, "../mappings/");
const mockMappingsFolder = join(__dirname, "./mockMappings/");

module.exports = {
  getMappingsList : function (useMocks) {
    const { lstatSync, readdirSync } = require('fs')
  
    const getSubDirectoryList = function(folder) {
      return readdirSync(folder).filter(item => lstatSync(join(folder, item)).isDirectory());
    };

    let folder = useMocks ? mockMappingsFolder : mappingsFolder;
    const items = getSubDirectoryList(folder);
    return items;
  },

  getMappingById : function (gamepadId, useMocks) {
    let folder = useMocks ? mockMappingsFolder : mappingsFolder;
    let mappingPath = join(folder, gamepadId, "mapping.json")
    let mapping = require(mappingPath);
    return mapping;
  },

  getValidator: function (schema, dependencies) {
    const { join } = require('path');
    const schemasFolder = join(__dirname, "../schemas/");
    const Ajv = require('ajv');
    const ajv = new Ajv();

    let validator;

    if (schema) {
      if (dependencies) {
        dependencies.forEach((dependency) => {
          ajv.addMetaSchema(require(join(schemasFolder, dependency)));
        })
      }
      validator = ajv.compile(require(join(schemasFolder, schema)));
    } else {
      const mainSchemaId = "https://immersive-web/gamepad-mapping/0.1.0/mapping.schema.json";
      let mainSchema;
      const fs = require("fs");
      const items = fs.readdirSync(schemasFolder);
      items.forEach( (filename) => {
        const schemaPath = schemasFolder + filename;
        const schema = require(schemaPath);
        if (schema.$id == mainSchemaId) {
          mainSchema = schema;
        } else {
          ajv.addMetaSchema(schema);
        }
      });
      validator =  ajv.compile(mainSchema);
    } 

    return validator;
  }
};
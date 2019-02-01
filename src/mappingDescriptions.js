const { join } = require('path');
const mappingsFolder = join(__dirname, "../mappings/");
const schemasFolder = join(__dirname, "../schemas/");
const mainSchemaId = "https://immersive-web/gamepad-mapping/0.1.0/mapping.schema.json";

var mappingDescriptions = {
  getSchemaValidator: function() {
    // Load json validator
    var Ajv = require('ajv');
    let ajv = new Ajv({schemaId: 'id'});
    ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
    
    // Load schema text
    const fs = require("fs");
    let mainSchema;
    const items = fs.readdirSync(schemasFolder);
    items.forEach( (filename) => {
      const schemaPath = schemasFolder + filename;
      const schema = require(schemaPath);
      if (schema.id == mainSchemaId) {
        mainSchema = schema;
      } else {
        ajv.addMetaSchema(schema);
      }
    });

    let validator = ajv.compile(mainSchema);
    return validator;
  },

  getList : function () {
    const { lstatSync, readdirSync } = require('fs')
  
    const getSubDirectoryList = function(folder) {
      return readdirSync(folder).filter(item => lstatSync(join(folder, item)).isDirectory());
    };

    const items = getSubDirectoryList(mappingsFolder);
    return items;
  },
  
  getMappingById : function (gamepadId) {
    let mappingPath = join(mappingsFolder, gamepadId, "mapping.json")
    let mapping = require(mappingPath);
    return mapping;
  }
};

module.exports = mappingDescriptions;
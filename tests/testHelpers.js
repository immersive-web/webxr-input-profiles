module.exports = {
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
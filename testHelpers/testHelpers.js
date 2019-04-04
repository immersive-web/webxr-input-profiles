global.fetch = require('jest-fetch-mock');

const Ajv = require('ajv');
const { join } = require('path');
const fs = require('fs-extra');

const profilesFolderPath = join(__dirname, '../profiles');

const TestHelpers = {
  profilesFolderPath,

  getSupportedProfilesList() {
    const folderContents = fs.readdirSync(profilesFolderPath);
    const profilesList = [];
    folderContents.forEach((item) => {
      const path = join(profilesFolderPath, item);
      if (fs.lstatSync(path).isDirectory()) {
        profilesList.push(item);
      }
    });
    return profilesList;
  },

  getProfile(profileName, includeBaseUri) {
    const folderPath = join(profilesFolderPath, profileName);
    const profile = fs.readJSONSync(join(folderPath, 'profile.json'));
    if (includeBaseUri) {
      profile.baseUri = folderPath;
    }
    return profile;
  },

  /**
   * @description Gets a schema validator for the schema file described by
   * the schema parameter.  If no schema parameter is supplied, the top-level
   * profile schema is used
   * @param {String} [schema] - The filename of the schema to use for
   * validation
   * @param {String[]} [dependencies] - The list of filenames that the schema
   * parameter is dependent on
   * @returns {Object} An AJV validator that can be used to validate profiles
   */
  getValidator(schemaFilename, dependencies) {
    const schemasFolder = join(__dirname, '../schemas/');
    const ajv = new Ajv();

    let mainSchema;

    if (schemaFilename) {
      if (dependencies) {
        dependencies.forEach((dependency) => {
          ajv.addMetaSchema(fs.readJSONSync(join(schemasFolder, dependency)));
        });
      }
      mainSchema = fs.readJSONSync(join(schemasFolder, schemaFilename));
    } else {
      const mainSchemaId = 'https://immersive-web/gamepad-profiles/0.1.0/profile.schema.json';
      const items = fs.readdirSync(schemasFolder);
      items.forEach((filename) => {
        const schemaPath = join(schemasFolder, filename);
        if (schemaPath.endsWith('.schema.json')) {
          const schema = fs.readJSONSync(schemaPath);
          if (schema.$id === mainSchemaId) {
            mainSchema = schema;
          } else {
            ajv.addMetaSchema(schema);
          }
        }
      });
    }

    const validator = ajv.compile(mainSchema);
    return validator;
  },

  /**
   * @description Makes a deep copy of JSON-compatible objects
   * @param {Object} objectToCopy - The object to copy
   * @returns {Object} A copy of the object
   */
  copyJsonObject(objectToCopy) {
    return JSON.parse(JSON.stringify(objectToCopy));
  }

};

global.TestHelpers = TestHelpers;

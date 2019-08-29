const path = require('path');
const fs = require('fs-extra');
const Ajv = require('ajv');
const optionalRequire = require('optional-require')(require);

const registryPath = optionalRequire.resolve('@webxr-input-profiles/registry', '');

/**
 * Validate the profile against the schema
 * @param {object} profileJson - the profile to validate
 */
function validateAgainstSchema(profileJson) {
  const ajv = new Ajv();
  const assetSchemaFolder = path.join(__dirname, '../schemas');

  // Get the main schema
  const mainSchemaFilename = 'profile.schema.json';
  const mainSchemaPath = path.join(assetSchemaFolder, mainSchemaFilename);
  const mainSchema = fs.readJsonSync(mainSchemaPath);
  const mainSchemaId = mainSchema.$id;

  const items = fs.readdirSync(assetSchemaFolder);
  items.forEach((filePath) => {
    const schemaPath = path.join(assetSchemaFolder, filePath);
    if (schemaPath !== mainSchemaPath) {
      const schema = fs.readJsonSync(schemaPath);
      ajv.addSchema(schema);
    }
  });

  // Load the dependent schema from the registry's schemas
  const registrySchemasFolder = path.join(path.dirname(registryPath), 'schemas');
  const registryCommonSchemaFilename = 'common.schema.json';
  const registryCommonSchemaPath = path.join(registrySchemasFolder, registryCommonSchemaFilename);
  const commonSchema = fs.readJsonSync(registryCommonSchemaPath);
  commonSchema.$id = mainSchemaId.replace(mainSchemaFilename, registryCommonSchemaFilename);
  ajv.addSchema(commonSchema);

  // Validate the supplied profile
  const validator = ajv.compile(mainSchema);
  if (!validator(profileJson)) {
    const errors = JSON.stringify(validator.errors, null, 2);
    throw new Error(`${profileJson.id} Failed to validate schema with errors: ${errors}`);
  }
}

function validate(profileJson) {
  if (!profileJson.profileId) {
    throw new Error('Profile does not have id');
  }

  validateAgainstSchema(profileJson);
}

module.exports = validate;

const path = require('path');
const fs = require('fs-extra');
const Ajv = require('ajv');

/**
 * Validate the profile against the schema
 * @param {object} profileJson - the profile to validate
 */
function validateAgainstSchema(profileJson) {
  const ajv = new Ajv();
  const schemaFolder = path.join(__dirname, '../schemas');
  const mainSchemaPath = path.join(schemaFolder, 'profile.schema.json');

  const items = fs.readdirSync(schemaFolder);
  items.forEach((filePath) => {
    const schemaPath = path.join(schemaFolder, filePath);
    if (schemaPath !== mainSchemaPath) {
      const schema = fs.readJsonSync(schemaPath);
      ajv.addMetaSchema(schema);
    }
  });

  const mainSchema = fs.readJsonSync(mainSchemaPath);
  const validator = ajv.compile(mainSchema);
  if (!validator(profileJson)) {
    const errors = JSON.stringify(validator.errors, null, 2);
    throw new Error(`Failed to validate schema with errors: ${errors}`);
  }
}

/**
 * Validate button-related things that cannot be done via schema validation
 * @param {Object} layout - The layout to validate
 * @param {string} id - The layout id
 * @param {object} components - The components in a specific layout
 * @param {*} buttons - The array mapping to the Gamepad.buttons array
 * @param {*} mapping - The layout's Gamepad.mapping value
 */
function validateGamepadButtonIndices({ id, components, gamepad: { buttons } }, mapping) {
  // Validate no duplicates of non-null entries
  const noNulls = buttons.filter(item => item !== null);
  const noDuplicates = new Set(noNulls);
  if (noNulls.length !== noDuplicates.size) {
    throw new Error(`Layout ${id} has duplicate components gamepad.buttons`);
  }

  // Validate the references in the buttons array are valid
  buttons.forEach((componentId, index) => {
    // Skip null entries
    if (!componentId) {
      return;
    }

    // Check the there is an actual component with the id at the Gamepad.buttons entry
    const component = components[componentId];
    if (!component) {
      throw new Error(
        `Layout ${id} has unknown component id ${componentId} at gamepad.buttons[${index}]`
      );
    }

    // If the gamepad is of the 'xr-standard' mapping, check that the components in
    // the first four entries in the Gamepad.buttons array have types that match
    // component types as described in the WebXR Gamepads Module
    const xrStandardMapping = 'xr-standard';
    if (mapping === xrStandardMapping && index < 4) {
      const xrStandardMappingButtonTypes = ['trigger', 'grip', 'touchpad', 'thumbstick'];
      const requiredComponentType = xrStandardMappingButtonTypes[index];
      if (component.type !== requiredComponentType) {
        throw new Error(
          `Layout ${id} must have a ${requiredComponentType} at gamepad.buttons[${index}]`
        );
      }
    }
  });
}

/**
 * Validate button-related things that cannot be done via schema validation
 * @param {Object} layout - The layout to validate
 * @param {string} id - The layout id
 * @param {object} components - The components in a specific layout
 * @param {object} axes - The array mapping to the Gamepad.axes array
 * @param {string} mapping - The layout's Gamepad.mapping value
 */
function validateGamepadAxesIndices({ id, components, gamepad: { axes } }, mapping) {
  // Validate no duplicates of non-null entries
  const noNulls = axes.filter(item => item !== null).map(item => JSON.stringify(item));
  const noDuplicates = new Set(noNulls);
  if (noNulls.length !== noDuplicates.size) {
    throw new Error(`Layout ${id} has duplicate components gamepad.axes`);
  }

  // Check the Gamepad.axes to make sure all used entries point to components that
  // actually support axes
  axes.forEach((axisDescription, index) => {
    // Skip null entries
    if (!axisDescription) {
      return;
    }

    // Ensure the entry has the necessary parts
    if (!axisDescription.componentId || !axisDescription.axis) {
      throw new Error(
        `Layout ${id} must have a valid component/axis pairing in Gamepad.axes[${index}]`
      );
    }

    // Check the there is an actual component with the id at the Gamepad.buttons entry
    const { componentId, axis } = axisDescription;
    const component = components[componentId];
    if (!component) {
      throw new Error(
        `Layout ${id} has unknown component id ${componentId} at gamepad.axis[${index}]`
      );
    }

    // Valiate the Gamepad.axes array is conformant with the specified Gamepad.mapping
    const xrStandardMapping = 'xr-standard';
    if (mapping !== xrStandardMapping) {
      // If the gamepad is not of a xr-standard mapping, still validate that the entries are
      // thumbsticks or touchpads
      if (!(component.type === 'thumbstick' || component.type === 'touchpad')) {
        throw new Error(`Layout ${id} Component at gamepad.axes[${index}] must support axes`);
      }
    }
    if (index < 4) {
      // If the gamepad is of the 'xr-standard' mapping, check that the components in
      // the first four entries in the Gamepad.axes array have types that match
      // component types as described in the WebXR Gamepads Module
      const xrStandardMappingAxes = [
        { type: 'touchpad', axis: 'xAxis' },
        { type: 'touchpad', axis: 'yAxis' },
        { type: 'thumbstick', axis: 'xAxis' },
        { type: 'thumbstick', axis: 'yAxis' }
      ];
      const { type: requiredComponentType, axis: requiredAxis } = xrStandardMappingAxes[index];

      if (component.type !== requiredComponentType) {
        throw new Error(
          `Layout ${id} requires ${requiredComponentType} at gamepad.axes[${index}]`
        );
      }

      if (requiredAxis !== axis) {
        throw new Error(`Layout ${id} requires ${requiredAxis} at Gamepad.axes[${index}]`);
      }
    }
  });
}

function validate(profileJson, profilesListJson) {
  if (!profileJson.profileId) {
    throw new Error('Profile does not have id');
  }

  try {
    validateAgainstSchema(profileJson);

    Object.keys(profileJson.layouts).forEach((layoutId) => {
      const layout = profileJson.layouts[layoutId];

      // Validate select source points to a valid component
      if (!layout.components[layout.selectSource]) {
        throw new Error(`selectionSource ${layout.selectSource} is not a known component`);
      }

      // Validate gamepad arrays match components
      validateGamepadButtonIndices(layout, profileJson.mapping);
      validateGamepadAxesIndices(layout, profileJson.mapping);
    });

    // Validate fallbackProfiles are real
    profileJson.fallbackProfileIds.forEach((profileId) => {
      if (!profilesListJson[profileId]) {
        throw new Error(`Fallback profile ${profileId} does not exist`);
      }
    });

    // TODO validate the fallback profiles match the layout
  } catch (error) {
    error.message = `${profileJson.profileId} - ${error.message}`;
    throw error;
  }
}

module.exports = validate;

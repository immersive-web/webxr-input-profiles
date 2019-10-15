
const xrStandardMapping = 'xr-standard';
const xrStandardComponents = {
  TRIGGER: { id: 'xr-standard-trigger', type: 'trigger' },
  SQUEEZE: { id: 'xr-standard-squeeze', type: 'squeeze' },
  TOUCHPAD: { id: 'xr-standard-touchpad', type: 'touchpad' },
  THUMBSTICK: { id: 'xr-standard-thumbstick', type: 'thumbstick' }
};

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
    if (mapping === xrStandardMapping && index < 4) {
      const xrStandardButtonOrder = [
        xrStandardComponents.TRIGGER.id,
        xrStandardComponents.SQUEEZE.id,
        xrStandardComponents.TOUCHPAD.id,
        xrStandardComponents.THUMBSTICK.id
      ];
      if (componentId !== xrStandardButtonOrder[index]) {
        throw new Error(
          `Layout ${id} must have a ${xrStandardButtonOrder[index]} at gamepad.buttons[${index}]`
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

  // Check each axis Gamepad.axes to make sure all entries are valid
  const xAxisId = 'x-axis';
  const yAxisId = 'y-axis';
  let previousAxisDescription = null;
  axes.forEach((axisDescription, index) => {
    // Skip null entries
    if (!axisDescription) {
      previousAxisDescription = null;
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

    // Check that the first four entries are exactly correct for the xr-standard mapping.
    // For all other entries, ensure the component can report axes and that the axis ordering
    // is valid
    if (mapping === xrStandardMapping && index < 4) {
      const xrStandardAxisOrder = [
        xrStandardComponents.TOUCHPAD.id,
        xrStandardComponents.TOUCHPAD.id,
        xrStandardComponents.THUMBSTICK.id,
        xrStandardComponents.THUMBSTICK.id
      ];

      if (componentId !== xrStandardAxisOrder[index]) {
        throw new Error(
          `Layout ${id} requires ${xrStandardAxisOrder[index]} at gamepad.axes[${index}]`
        );
      }
    } else if (!(component.type === 'thumbstick' || component.type === 'touchpad')) {
      throw new Error(`Layout ${id} Component at gamepad.axes[${index}] must support axes`);
    }

    // Ensure the axis ids are in order x-axis followed by y-axis for a single component
    let expectedAxisId = xAxisId;
    if (previousAxisDescription
      && previousAxisDescription.componentId === componentId
      && previousAxisDescription.axis === xAxisId) {
      expectedAxisId = yAxisId;
    }

    if (axis !== expectedAxisId) {
      throw new Error(`Layout ${id} axis must be ${expectedAxisId} at gamepad.axes[${index}`);
    }

    // Save the axis description for comparing next time
    previousAxisDescription = axisDescription;
  });
}

function validateComponents({ id, components }, mapping) {
  if (mapping === xrStandardMapping) {
    let triggerFound = false;
    Object.keys(components).forEach((componentId) => {
      if (xrStandardComponents[componentId]) {
        triggerFound = triggerFound || (componentId === xrStandardComponents.TRIGGER);

        const expectedType = xrStandardComponents[componentId].type;
        if (components[componentId].type !== expectedType) {
          throw new Error(`Layout ${id} xr-standard ${componentId} must be type ${expectedType}`);
        }
      }
    });

    if (!triggerFound) {
      throw new Error(`Layout ${id} does not have the ${xrStandardComponents.TRIGGER} component`);
    }
  }
}

function validate(profileJson, profilesListJson) {
  if (!profileJson.profileId) {
    throw new Error('Profile does not have id');
  }

  try {
    Object.keys(profileJson.layouts).forEach((layoutId) => {
      const layout = profileJson.layouts[layoutId];

      validateComponents(layout, profileJson.mapping);

      // Validate select source points to a valid component
      if (!layout.components[layout.selectComponentId]) {
        throw new Error(`Layout ${layout.id} no selectComponentId ${layout.selectComponentId}`);
      }

      // Validate gamepad arrays match components
      if (layout.gamepad) {
        validateGamepadButtonIndices(layout, profileJson.mapping);
        validateGamepadAxesIndices(layout, profileJson.mapping);
      }
    });

    const fallbackIds = profileJson.fallbackProfileIds;
    if (profilesListJson) {
      // Validate fallbackProfiles are real
      fallbackIds.forEach((profileId) => {
        if (!profilesListJson[profileId]) {
          throw new Error(`Fallback profile ${profileId} does not exist`);
        }
      });
    }

    if (!profileJson.profileId.startsWith('generic-')) {
      const lastFallbackId = fallbackIds[fallbackIds.length - 1];
      if (!lastFallbackId.startsWith('generic-')) {
        throw new Error('Final fallback profile id must be for a generic profile');
      }
    }
  } catch (error) {
    error.message = `${profileJson.profileId} - ${error.message}`;
    throw error;
  }
}

module.exports = validate;

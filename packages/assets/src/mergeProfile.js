function validateKeyMatch(obj1, obj2) {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  const match = (keys1.length === keys2.length)
              && keys1.every(key => obj2[key]);
  return match;
}

function mergeComponents(components1, components2) {
  if (!validateKeyMatch(components1, components2)) {
    throw new Error('Layout handedness keys do not match');
  }

  const mergedComponents = {};
  Object.keys(components1).forEach((componentId) => {
    const component = { ...components1[componentId], ...components2[componentId] };
    mergedComponents[componentId] = component;
  });

  return mergedComponents;
}

function mergeLayouts(layouts1, layouts2) {
  if (!validateKeyMatch(layouts1, layouts2)) {
    throw new Error('Layout handedness keys do not match');
  }

  const mergedLayouts = {};
  Object.keys(layouts1).forEach((handedness) => {
    const layout1 = layouts1[handedness];
    const layout2 = layouts2[handedness];

    mergedLayouts[handedness] = {
      ...layout1,
      ...layout2
    };

    if (layout1.components && layout2.components) {
      const components = mergeComponents(layout1.components, layout2.components);
      mergedLayouts[handedness].components = components;
    }
  });

  return mergedLayouts;
}

/**
 * Expand 'left-right' into two separate entries and expand 'left-right-none' into three
 * separate entries
 * @param {object} layouts
 */
function expandLayouts(layouts) {
  const expandedLayouts = {};
  Object.keys(layouts).forEach((key) => {
    const layout = layouts[key];
    if (key === 'left' || key === 'right' || key === 'none') {
      expandedLayouts[key] = JSON.parse(JSON.stringify(layout));
    } else if (key === 'left-right') {
      expandedLayouts.left = JSON.parse(JSON.stringify(layout));
      expandedLayouts.right = JSON.parse(JSON.stringify(layout));
    } else if (key === 'left-right-none') {
      expandedLayouts.left = JSON.parse(JSON.stringify(layout));
      expandedLayouts.right = JSON.parse(JSON.stringify(layout));
      expandedLayouts.none = JSON.parse(JSON.stringify(layout));
    }
  });

  return expandedLayouts;
}

/**
 * Add and populate the gamepadIndices property on all components in each layout
 * @param {object} registryJson
 */
function integrateGamepadIndices(registryJson) {
  const registryLayouts = expandLayouts(registryJson.layouts);

  // Build a hierarchy that matches layouts.components hierarchy that is filled with gamepadIndices
  const integratedLayouts = {};
  Object.keys(registryLayouts).forEach((handedness) => {
    const registryLayout = registryLayouts[handedness];
    const { mapping, buttons: buttonsArray, axes: axesArray } = registryLayout.gamepad;
    const integratedComponents = {};

    // Add button indices to components
    buttonsArray.forEach((componentId, index) => {
      if (componentId) {
        integratedComponents[componentId] = { gamepadIndices: { button: index } };
      }
    });

    // Add axis indices to components
    axesArray.forEach((axisDescription, index) => {
      if (axisDescription) {
        const { componentId, axis } = axisDescription;
        if (integratedComponents[componentId]) {
          integratedComponents[componentId].gamepadIndices[axis] = index;
        } else {
          integratedComponents[componentId] = { gamepadIndices: { [axis]: index } };
        }
      }
    });

    // Merge the gamepad indices into the original layouts
    const mergedComponents = mergeComponents(
      registryLayout.components,
      integratedComponents
    );
    integratedLayouts[handedness] = { mapping, components: mergedComponents };
  });

  return integratedLayouts;
}

function mergeProfile(registryJson, assetJson) {
  // Make sure the files actually match
  if (assetJson.profileId !== registryJson.profileId) {
    throw new Error(
      `Profile id mismatch registry=${registryJson.profileId} asset=${assetJson.profileId}`
    );
  }

  try {
    const assetPathLayouts = expandLayouts(assetJson.assets);
    const assetComponentsLayouts = expandLayouts(assetJson.layouts);
    const assetLayouts = mergeLayouts(assetPathLayouts, assetComponentsLayouts);

    const registryLayouts = integrateGamepadIndices(registryJson);

    const mergedLayouts = mergeLayouts(registryLayouts, assetLayouts);

    const mergedProfile = {
      profileId: assetJson.profileId,
      layouts: mergedLayouts
    };

    return mergedProfile;
  } catch (error) {
    error.message = `${assetJson.profileId} - ${error.message}`;
    throw error;
  }
}

module.exports = mergeProfile;

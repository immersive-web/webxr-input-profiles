const path = require('path');
const fs = require('fs-extra');
const merge = require('merge-deep');
const optionalRequire = require('optional-require')(require);

const registryModulePath = optionalRequire.resolve('@webxr-input-profiles/registry', '');

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
 * @param {object} registryProfile
 */
function integrateGamepad(registryLayouts) {
  // Build a hierarchy that matches layouts.components hierarchy that is filled with gamepadIndices
  const layouts = {};
  Object.keys(registryLayouts).forEach((handedness) => {
    const { gamepad } = registryLayouts[handedness];
    const { buttons: buttonsArray, axes: axesArray } = gamepad;
    const components = {};

    // Add button indices to components
    buttonsArray.forEach((componentId, index) => {
      if (componentId) {
        components[componentId] = { gamepadIndices: { button: index } };
      }
    });

    // Add axis indices to components
    axesArray.forEach((axisDescription, index) => {
      if (axisDescription) {
        const { componentId, axis } = axisDescription;
        if (components[componentId]) {
          components[componentId].gamepadIndices[axis] = index;
        } else {
          components[componentId] = { gamepadIndices: { [axis]: index } };
        }
      }
    });

    const mergedComponents = merge(registryLayouts[handedness].components, components);
    layouts[handedness] = { mapping: gamepad.mapping, components: mergedComponents };
  });

  // Merge the gamepad indices into the original layouts
  return layouts;
}

function mergeProfile(profilePath, assetProfile) {
  // Get the matching file from the registry
  const registryFolder = path.join(path.dirname(registryModulePath), 'profiles');
  const registryProfile = fs.readJsonSync(path.join(registryFolder, profilePath));

  // Make sure the files actually match
  if (assetProfile.profileId !== registryProfile.profileId) {
    throw new Error(
      `Profile id mismatch registry=${registryProfile.profileId} asset=${assetProfile.profileId}`
    );
  }

  const { profileId } = assetProfile;
  const registryLayouts = integrateGamepad(registryProfile.layouts);
  const layouts = merge(
    expandLayouts(assetProfile.assets),
    expandLayouts(registryLayouts),
    expandLayouts(assetProfile.layouts)
  );

  if (!layouts.none && !(layouts.left && layouts.right)) {
    throw new Error(
      `${assetProfile.id} must have layouts for none, left/right, or left/right/none handedness`
    );
  }

  const mergedProfile = {
    profileId,
    layouts
  };

  return mergedProfile;
}

module.exports = mergeProfile;

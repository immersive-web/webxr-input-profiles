# WebXR Input Profiles - Assets

[![Build Status](https://travis-ci.com/immersive-web/webxr-input-profiles.svg?branch=master)](https://travis-ci.org/immersive-web/webxr-input-profiles)

## Overview
This package provides 3D assets and JSON descriptions of how to relate those assets to the `XRInputSource` objects with matching profile ids. This package can be used on its own, but may be easier to use with the javascript library in the [@webxr-input-source/motion-controllers](../motion-controllers) package also published by this repository. Assets are available under MIT license in .glTF, or .glb formats.

## Contributing
All profiles are located under the './profiles' folder in subfolders for vendor prefixes. At build time, these profiles are combined with the matching profiles from the [registry](../packages/registry/README.md) package and a merged JSON profile is output for each match.

### Adding an asset
New assets must match a profile a profiles id in the [registry](../registry) package. To add an asset, save a JSON file that conforms with the [schema](#schema) in `./profiles/[vendor prefix]/[profile id]`. In the same `./profiles/[vendor prefix]` folder, place the `.glB` or `.glTF` and dependent files.  Ensure that the JSON file points to the correct relative path of the 3D files. The package must [build](#development) successfully before submitting a pull request.

### Filing a bug
To file bugs on existing assets, use this [issue template](https://github.com/immersive-web/webxr-input-profiles/issues/new?assignees=&labels=assets&template=asset-bug-report.md&title=)

### Development
In general, this package should be built and tested from the root of the repository using the following command:
> npm run test

To build just this package without running tests, invoke the following command from the root of the repository:
> npm run build -- --scope @webxr-input-profiles/assets

To visually validate the asset looks and behaves as expected, follow the [viewer](../viewer) instructions.

### Licence
See the [LICENSE.md](LICENSE.md).

## Usage

### Getting started
To install this package:
```
npm install @webxr-input-profiles/assets
```

## Schema

### Profile id
Profiles are required to have a `profileId` that uniquely identifies the profile and must match an existing profile id in the [registry](../registry/README.md).

```json
{
    "profileId" : "motion-controller-id"
}
```

### Layout and asset enumeration
Profiles are required to have a `layouts` property which contains the layouts for each supported `handedness`. Profiles are also required to have a `assets` property which contains the paths of assets for each supported `handedness`.  Both the `layouts` property and the `assets` properties must each have one, and only one, of the following arrangements of keys to be considered valid.
* `none`
* `left` and `right`
* `left` and `right` and `none`
* `left-right`
* `left-right` and `none`
* `left-right-none`

For example:
```json
{
    "assets": {
        "none": {},
        "left": {},
        "right": {}
    },
    "layouts": {
        "none" : {},
        "left-right": {}
    }
}
```

The keys in `layouts` and `assets` do not need to match, however expanded form of supported `handedness` values must match. For example, the following is **invalid**:
```json
{
    "assets": {
        "left": {},
        "right": {}
    },
    "layouts": {
        "left-right-none" : {},
    }
}
```

#### Assets
The value of each key in the `assets` object must contain two properties: `path` and `rootNodeName`. The `path` is a relative path to the asset for that `handedness`. The `rootNodeName` is the name of the node within the 3D asset file that represents the top of the hierarchy of the 3D model for the `XRInputSource` with that `handedness`.

```json
{
    "assets": {
        "none": {
            "path": "path to asset",
            "rootNodeName": "motionControllerRoot"
        }
    }
}
```

### Components
The each key in the `layouts` object must point to an object which contains a `components` property which, itself, contains keys for every component id in the associated registry profile.  Each component id key must point to an object which contains three properties: `rootNodeName`, `labelAnchorNodeName`, and `visualResponses`.  The `rootNodeName` of a component is the top node in the 3D asset hierarchy representing the component.  The `labelAnchorNodeName` is the name of a node at which is it safe to place an 3D object with the explananation of a component's purpose.  This node must be underneath the `rootNodeName` at a location that will not intersect the 3D model's geometry.  The `visualResponses` property is an array of [visual changes](#visual-responses) the component can apply in response to state changes in the backing `XRInputSource`.

For example
```json
{
    "layouts": {
        "none": {
            "components": {
                "myHardwareTrigger": {
                    "rootNodeName" : "SELECT",
                    "labelAnchorNodeName" : "trigger-label",
                    "visualResponses": []
                }
            }
        }
    }
}
```

### Visual responses
The visual representation of a motion controller in a VR must respond to reflect its physical state in the real-world.  For example, when a physical thumbstick is moved to the left, the virtual thumbstick should also move to the left.  The `visualResponses` array contains descriptions of all visual changes that can occur when a controller part is interacted with.

Each element in this array must contain a `rootNodeName` property which references the node containing the rest of the nodes needed for the visualization. It must also contain a `componentProperty` property set to one of four values: `button`, `xAxis`, `yAxis`, or `state`.  This indicates which component property will be used to drive the visualization.  Lastly, the element must contains a `states` array which indicates the component states for which the visualization will apply.

```json
{
    "visualResponses" : [
        {
            "rootNodeName": "THUMBSTICK_X",
            "componentProperty": "xAxis",
            "states": ["default", "touched", "pressed"]
        }
    ]
}
```

By default the visualization will use `"VALUE"` for the name of the target node, though this can be overridden by supplying the `targetNodeName` property.

```json
{
    "visualResponses" : [
        {
            "rootNodeName": "THUMBSTICK_X",
            "componentProperty": "xAxis",
            "states": ["default", "touched", "pressed"],
            "targetNodeName": "TARGET"
        }
    ]
}
```

By default, all visualizations will use `"MIN"` and `"MAX"` the names of the nodes representing the extents of motion. To override these node names supply an alternative `minNodeName` and `maxNodeName` respectively.

```json
{
    "visualResponses" : [
        {
            "rootNodeName": "THUMBSTICK_X",
            "componentProperty": "xAxis",
            "states": ["default", "touched", "pressed"],
            "minNodeName": "LEFT",
            "maxNodeName": "RIGHT"
        }
    ]
}
```

When a visualization is toggling a node's visibility, the `componentProperty` must be set to `state` and the additional `property` property set to `visibility`.

```json
{
    "visualResponses" : [
        {
            "rootNodeName": "TOUCH_DOT",
            "componentProperty": "state",
            "states": ["touched", "pressed"],
            "property": "visibility"
        }
    ]
}
```

#### Thumbstick visual response example
Commonly, the visual responses for a thumbstick will be as follows:
```json
{
    "visualResponses": [
        {
            "rootNodeName": "THUMBSTICK_PRESS",
            "componentProperty" : "state",
            "states" : ["pressed"]
        },
        {
            "rootNodeName": "THUMBSTICK_X",
            "componentProperty" : "xAxis",
            "states" : ["default", "touched", "pressed"]
        },
        {
            "rootNodeName": "THUMBSTICK_Y",
            "componentProperty" : "yAxis",
            "states" : ["default", "touched", "pressed"]
        }
    ]
}
```

#### Touchpad visual response values
Commonly, the visual responses for a touchpad will be as follows:
```json
{
    "visualResponses": [
        {
            "rootNodeName": "TOUCHPAD_PRESS",
            "componentProperty" : "state",
            "states" : ["pressed"]
        },
        {
            "rootNodeName": "TOUCH",
            "componentProperty" : "state",
            "states" : ["touched", "pressed"],
            "property": "visibility"
        },
        {
            "rootNodeName": "TOUCHPAD_TOUCH_X",
            "componentProperty" : "xAxis",
            "states" : ["default", "touched", "pressed"]
        },
        {
            "rootNodeName": "TOUCHPAD_TOUCH_Y",
            "componentProperty" : "yAxis",
            "states" : ["default", "touched", "pressed"]
        }
    ]
}
```
#### Button visual response values
Commonly, the visual response for an analog button, such as a trigger, will be as follows:
```json
{
    "visualResponses": [
        {
            "rootNodeName" : "SELECT",
            "componentProperty" : "button",
            "states" : ["default", "touched", "pressed"]
        }
    ]
}
```

Alternatively, digital buttons may be better represented like this example:
```json
{
    "visualResponses": [
        {
            "rootNodeName" : "MENU",
            "componentProperty" : "state",
            "states" : ["pressed"]
        }
    ]
}
```

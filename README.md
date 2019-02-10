# Gamepad mapping
> Put in a picture of a motion controller and the Gamepad data structure

## Motivation
> Explain what WebXR is and how it's different from WebVR

XR hardware may support a variety of input sources including motion controllers. When a motion controller is present, developers often wish to do the following:
1. Display the motion controller's virtual model at the correct location
1. Find out the state of the controller's component parts (made up of buttons and axes)
1. Modify the virtual model to reflect the state of the components each render frame
1. Provide a key or legend that explains the mapping of components to actions

The state of an XR motion controller's buttons, thumbsticks, dpads, and touchpads is made available to developers via the the [Gamepad API](https://www.w3.org/TR/gamepad/). This data is divided up and populated in the `Gamepad.buttons` array and the `Gamepad.axes` array. While this system was adequate for the relatively homogenous console gaming controllers, it breaks down for XR motion controllers as they have not yet converged on a common form factor. In addition, the [Gamepad API](https://www.w3.org/TR/gamepad/) does not provide any information about the visualization of a `Gamepad` object which is a requirement to displaying a virtual copy of motion controller on opaque XR headsets.

## Overview
This repository defines a JSON schema to bridge the gap between the needs listed above and the abstract data reported by `Gamepad` objects. For each known motion controller, there is a folder in this repository at `./mappings/<Gamepad.id>/`.  In this folder is a `mapping.json` file which enumerates how to interpret the `Gamepad` data, paths to included 3D asset files representing the `Gamepad`, and the metadata necessary bind them together. Assets are available under MIT license in .glTF or .glB  format with a schema extension to be defined so additional formats may also be made available in the future.

## Design Goals
This repository has been designed to meet the following goals:
* *Distributable and modifiable.* All content in this repo is available under MIT licence. Feel free to take this schema and modify it for your own purposes.
* *Community populated.* The schema, validation tests, and tools are designed to make it straightforward to submit a pull request with new mapping files and assets as new XR hardware comes on the market
* *No custom code necessary.* Because all hardware metadata (min/max ranges, etc) can be defined in the JSON mapping file, developers should not need to add code checks for specific `Gamepad.id`. Aberrant user agent behavior can also be documented in the schema as bugs are discovered.
* *WebXR optimized, WebVR compatible.* While WebVR is still available in several user agents, the future of XR on the web is in the standards-track API, WebXR. As such, when faced with tradeoffs, the design was optimized to simplify the schema for WebXR usage while still maintaining a path for WebVR usage.

## Adding New Hardware
> TODO fill in the steps for adding a folder for a new XR device, testing the change, and submitting for PR

> Create an issue template for new hardware PRs

## Filing A Bug
> TODO fill in the steps for filing a bug

> Create an issue template for bugs

# Concepts
![Diagram of top-level schema parts](./figures/Concepts.png)

## Data Sources
> REFER TO BRANDON'S PR ON HOW BUTTONS AND AXES ARE SLOTTED FOR WEBXR

Motion controllers are made up of various parts such as thumbsticks, touchpads, triggers, buttons, or dpads.  The [Gamepad API](https://www.w3.org/TR/gamepad/) communicates the state of these parts via the `Gamepad.buttons` array and the `Gamepad.axes` array. However, a single physical part is divided into separate, unrelated attributes. 

For example, a thumbstick's left-right motion is communicated as a double value in an entry in the `Gamepad.axes` array while the top-bottom motion is in a separate `Gamepad.axes` entry. Furthermore if the thumbstick can be clicked straight down, that pressed/touched/value information is communicated by a `GamepadButton` in the `Gamepad.buttons` array.  The `Gamepad` does not provide any indication that these three array entries are related in any way, despite all representing different aspects of the same physical part.

Each element in this schema's `"dataSources"` section provides the missing information necessary to group the related parts of a `Gamepad` object back together.  All entries in the `"dataSources"` array must include an `"id"` property which is unique among all other entries in the array.  For clarity sake, a `"dataSourceType"` is also included to indicate which subschema is being used to describe the physical properties of a single part.

### Buttons
A single button (including analog triggers and touchable thumbrests) is represented by an entry in the `dataSources` array with the `dataSourceType` property set to `buttonSource`.  It must also include a `buttonIndex` property with a value representing the index in the `Gamepad.buttons` array at which to find the button's data.  For example:

```json
{
    "gamepad" : {
        "dataSources" : [
            {
                "id" : "gripButton",
                "dataSourceType" : "buttonSource",
                "buttonIndex" : 2
            }
        ]
    }
}
```

When representing an analog button such as a trigger, the `analogValues` property must be present and set to `true`.  For example:

```json
{
    "gamepad" : {
        "dataSources" : [
            {
                "id" : "triggerButton",
                "dataSourceType" : "buttonSource",
                "buttonIndex" : 0,
                "analogValues" : true
            }
        ]
    }
}
```

When representing a button that can report a touched state but not a pressed state (eg. the thumbrest on the Oculus Touch), the `pressUnsupported` property must be present and set to `true`.  For example:

```json
{
    "gamepad" : {
        "dataSources" : [
            {
                "id" : "thumbrest",
                "dataSourceType" : "buttonSource",
                "buttonIndex" : 5,
                "pressUnsupported" : true
            }
        ]
    }
}
```

### Dpads
A dpad is a physical part that rocks in two directions, left-right and top-bottom button. These parts are built such that only adjacent directions can be depressed at the same time.  For example, a dpad could be pressed in the top and left directions at the same time, but could not be pressed in the left and right directions at the same time.

The `standard` mapping defined in the (Gamepad API)[https://www.w3.org/TR/gamepad/#remapping] suggests that dpad parts should be divided into 4 separate entries in the `Gamepad.buttons` array.  It has been observed, however, that some hardware may report dpads as two entries in the `Gamepad.axes` array instead.  As a result, this schema provides two different subschemas for use with a dpad as appropriate

#### Dpads From Buttons
A data source of this type is defined as one with the `dataSourceType` property set to `dpadFromButtonsSource`. It must include `leftIndex`, `rightIndex`, `upIndex`, and `downIndex` properties with values representing the indices in the `Gamepad.buttons` array at which to find the related data.  For example:

```json
{
    "gamepad" : {
        "dataSources" : [
            {
                "id" : "dpad",
                "type": "dpadFromButtonsSource",
                "leftIndex" : 3,
                "rightIndex" : 4,
                "upIndex" : 5, 
                "downIndex" : 6
            }
        ]
    }
}
```

Additionally, if any of the `GamepadButton` entries referenced by this data source are capable of reporting analog values, the `analogValues` property must be present and set to `true`.

#### Dpads From Axes
A data source of this type is defined as one with the `dataSourceType` property set to `dpadFromAxesSource`. It must include `xAxisIndex` and `yAxisIndex` properties with values representing the indices in the `Gamepad.axes` array at which to find the related data.  For example:

```json
{
    "gamepad" : {
        "dataSources" : [
            {
                "id" : "dpad",
                "type": "dpadFromAxesSource",
                "xAxisIndex" : 2,
                "yAxisIndex" : 3
            }
        ]
    }
}
```

### Thumbsticks And Touchpads
Thumbsticks are a physical part sticking up from the surface of a controller which can be rocked left/right and top/bottom with a circular range.  Often, thumbsticks can also be depressed in a button-like manner.  Touchpads are a physical part, usually circular, that are able to detect the position of a finger placed on their surface.  Often, touchpads can be depressed in the middle in a button-lime manner or at the edges in a dpad-like manner.

Both thumbsticks and touchpads are represented by an entry in the `dataSources` array with the `dataSourceType` property set to `thumbstickAndTouchpadSource`.  It must include `xAxisIndex` and `yAxisIndex` properties with values representing the indices in the `Gamepad.axes` array at which to find the related data.  For example:

```json
{
    "gamepad" : {
        "dataSources" : [
            {
                "id" : "touchpad",
                "type": "touchpadSource",
                "xAxisIndex" : 0,
                "yAxisIndex" : 1
            }
        ]
    }
}
```

If the thumbstick or touchpad is able to be depressed, the data source must also include a `buttonIndex` property with a value representing the index in the `Gamepad.buttons` array at which to find the button's data. On touchpads with a dpad-like physical behavior, the x-axis and y-axis values can be used to determine which quadrant(s) are being pressed. For example:

```json
{
    "gamepad" : {
        "dataSources" : [
            {
                "id" : "thumbstick",
                "type": "thumbstickSource",
                "xAxisIndex" : 0,
                "yAxisIndex" : 1,
                "buttonIndex" : 1
            }
        ]
    }
}
```

If the thumbstick or touchpad is able to be depressed in an analog manner, the data source must also include an `analogButtonValues` property with a value of `true`.

## Visual Responses
The visual representation of a motion controller in a VR must respond to reflect its physical state in the real-world.  For example, when a physical thumbstick is moved to the left, the virtual thumbstick should also move to the left.  In order to do this without requiring custom code for each `Gamepad.id`, the schema defines an array of `visualResponse` objects.

Each `visualResponse` must contain a `target` property which references the node in an asset to be modified.  Each `visualResponse` must also contain a `userAction` property set to either `onTouch` or `onPress`.  A `userAction` set to `onTouch` indicates the visual response is describing the desired state of `target` when the associated `GamepadButton.touched` is `true` or the associated elements in the `Gamepad.axes` array are non-zero.  A `userAction` set to `onPress` indicates the visual response is describing the desired state of `target` when the associated `GamepadButton.pressed` is `true`. When `visualResponse` objects have the same `target`, node properties described by a `userAction` equal to `onPress` will take precedence over those with a `userAction` of `onTouch`.

In addition to the `target` and `userResponse` properties, a `visualResponse` must have one of the following groups of properties.  Each property represents a node in the asset at the extent of the value which is it matched to:
* `buttonMin` and `buttonMax`
* `left`, `right`, `down`, and `up`
* `left`, `right`, `down`, `up`, `buttonMin`, and `buttonMax`

For example, a button part would have a `buttonMin` representing the visual state of `target` when the button is not being interacted with and a `buttonMax` representing the visual state of `target` when the button is fully pressed.  Developers are then able to interpolate the correct visualization of `target` by weighting `buttonMin` and `buttonMax` based on `GamepadButton.value`.  The javascript library shipped as part of this package includes this calculation.

### Button Visual Responses
Visual responses for button parts are expected to interpolate `target` properties based on the associated `GamepadButton.value` attribute. For example:

```json
{
    "gamepad" : {
        "visualResponses" : [
            {
                "userAction": "onTouch",
                "target" : "trigger-root",
                "buttonMin" : "trigger-transform-buttonMin",
                "buttonMax" : "trigger-transform-buttonMax"
            }
        ]
    }
}
```

### Dpad Visual Responses
Physical dpad parts rock around a central pivot, requiring their visual responses to interpolate between `left` and `right` as well as `down` and `up`.  The expected interpolation is different when associated based on a `dpadFromButtonSource` as opposed to a `dpadFromAxes`.  When associated with the former, `right` is weighted by the `GamepadButton.value` associated with the `rightButtonIndex`, `down` is weighted by the `GamepadButton.value` associated with the `downButtonIndex`, and so on.  When associated with the latter type of data source, the algorithm is a bit more complicated.  Only positive values in `Gamepad.axes` array at the `xAxisIndex` position are used for interpolation with the `right` node whereas only the absolute value of negative values are used for interpolation with the `left` node.  The same behavior applies to `up` and `down` regarding the data at the `yAxisIndex` in the `Gamepad.axes` array. In this manner, both types of data sources can be associated with a single type of visual response.  For example:

```json
{
    "gamepad" : {
        "visualResponses" : [
            {
                "userAction": "onTouch",
                "target" : "dpad-root",
                "left" : "dpad-transform-leftmost",
                "right" : "dpad-transform-rightmost",
                "down" : "dpad-transform-downmost",
                "up" : "dpad-transform-upmost"
            }
        ]
    }
}
```

### Thumbstick Visual Responses
Thumbsticks share physical characteristics with dpad, though they typically have a wider range of motion and may also be clickable.  For interpolating the `target` properties, only positive values in `Gamepad.axes` array at the `xAxisIndex` position are used with the `right` node, whereas only the absolute value of negative values are used with the `left` node.  The same behavior applies to `up` and `down` regarding the data at the `yAxisIndex` in the `Gamepad.axes` array. If clickable, `target` properties are also interpolated with `buttonMin` and `buttonMax` based on `GamepadButton.value`.  For example:

```json
{
    "gamepad" : {
        "visualResponses" : [
            {
                "userAction": "onTouch",
                "target" : "thumbstick-root",
                "left" : "thumbstick-transform-leftmost",
                "right" : "thumbstick-transform-rightmost",
                "down" : "thumbstick-transform-downmost",
                "up" : "thumbstick-transform-upmost",
                "buttonMin" : "thumbstick-transform-buttonMin",
                "buttonMax" : "thumbstick-transform-buttonMax"
            }
        ]
    }
}
```

### Touchpad Visual Responses
Thumbsticks share physical characteristics with dpad, though they may also be clickable.  Whereas all other data source types may use a `userAction` of `onTouch` for all visualizations, touchpad data sources will most likely only use an `onTouch` visualization to represent the touch-dot of the user's finger on the part.  Any motion of the touchpad itself due to being clickable, will likely be represented in a visualization with the `userAction` set to `onPress`.

In either case, the algorithm for interpolating the `target` properties is roughly the same.  Only positive values in `Gamepad.axes` array at the `xAxisIndex` position are used with the `right` node, whereas only the absolute value of negative values are used with the `left` node.  The same behavior applies to `up` and `down` regarding the data at the `yAxisIndex` in the `Gamepad.axes` array. If clickable, response visualizations with a `userAction` set to `onPress` may also interpolate `buttonMin` and `buttonMax` based on `GamepadButton.value`.  For example:

```json
{
    "gamepad" : {
        "visualResponses" : [
            {
                "userAction": "onTouch",
                "target" : "touchpadDot-root",
                "left" : "touchpadDot-transform-leftmost",
                "right" : "touchpadDot-transform-rightmost",
                "down" : "touchpadDot-transform-downmost",
                "up" : "touchpadDot-transform-upmost"
            },
            {
                "userAction": "onPress",
                "target" : "touchpad-root",
                "left" : "touchpad-transform-leftmost",
                "right" : "touchpad-transform-rightmost",
                "down" : "touchpad-transform-downmost",
                "up" : "touchpad-transform-upmost",
                "buttonMin" : "touchpad-transform-buttonMin",
                "buttonMax" : "touchpad-transform-buttonMax"
            }
        ]
    }
}
```

## Components
For example, here component mapping for a single button.
```json
{
    "gamepad" : {
        "components" : [
            {
                "dataSource" : 4,
                "root" : "trigger-root",
                "labelTransform" : "trigger-label-transform"
            }
        ],
        "dataSources" : [
            {
                "id" : "triggerButton",
                "dataSourceType" : "buttonSource",
                "buttonIndex" : 2
            }
        ]
    }
}
```

However, most components will also include one or more `visualResponses` such as the example below.

```json
{
    "gamepad" : {
        "components" : [
            {
                "dataSource" : 4,
                "root" : "trigger-root",
                "labelTransform" : "trigger-label-transform",
                "visualResponses" : [0]
            }
        ],
        "dataSources" : [
            {
                "id" : "triggerButton",
                "dataSourceType" : "buttonSource",
                "buttonIndex" : 2
            }
        ],
        "visualResponses" : [
            {
                "userAction": "onTouch",
                "target" : "trigger-root",
                "buttonMin" : "trigger-transform-buttonMin",
                "buttonMax" : "trigger-transform-buttonMax"
            }
        ]
    }
}
```

## Hands
> Hands are the binding of individual components into motion controllers.  Explain that hands come in `neutral`, `left`, and `right`.

### Neutral
> Explain the parts of a hand

```json
{
    "gamepad" : {
        "id" : "motion-controller-id",
        "hands" : {
            "neutral" : {
                "asset" : "some-url",
                "root" : "neutral-handedness-controller",
                "components" : [0]
            }
        }
    }
}
```

> Explain about primaryButtonComponent and primaryAxisComponent

```json
{
    "gamepad" : {
        "id" : "motion-controller-id",
        "hands" : {
            "neutral" : {
                "asset" : "some-url",
                "root" : "neutral-handedness-controller",
                "components" : [0],
                "primaryButtonComponent" : 0,
                "primaryAxisComponent" : 1
            }
        }
    }
}
```

#### Left and Right
> Explain about motion controllers that always report a handedness property

```json
{
    "gamepad" : {
        "id" : "motion-controller-id",
        "hands" : {
            "left" : {
                "asset" : "some-url",
                "root" : "left-handedness-controller",
                "components" : [0]
            },
            "right" : {
                "asset" : "some-url",
                "root" : "right-handedness-controller",
                "components" : [0]
            }
        }
    }
}
```

#### Dynamic Handedness
> Explain about motion controllers than can't distinguish right vs left, but report that way anyway

```json
{
    "gamepad" : {
        "id" : "motion-controller-id",
        "hands" : {
            "neutral" : {
                "asset" : "some-url",
                "root" : "neutral-handedness-controller",
                "components" : [0]
            },
            "left" : {
                "asset" : "some-url",
                "root" : "neutral-handedness-controller",
                "components" : [0]
            },
            "right" : {
                "asset" : "some-url",
                "root" : "neutral-handedness-controller",
                "components" : [0]
            }
        }
    }
}
```

# Appendices

## Known hardware
* [Windows Mixed Reality](mappings/045E-065D)
* Windows Mixed Reality for Samsung Odyssey
* [HTC Vive Controller](mappings/HTCViveController)
* [Oculus Touch](mappings/OculusTouch)
* [Gear VR](mappings/GearVR)
* [Oculus Go](mappings/OculusGo)
* Vive Focus
* Magic Leap
* Daydream
* Mirage Solo
* [Valve Knuckles](mappings/ValveKnuckles)
* HoloLens Clicker
* Oculus Remote

## References
* [GitHub - stewdio/THREE.VRController: Support hand controllers for Oculus, Vive, Windows Mixed Reality, Daydream, GearVR, and more by adding VRController to your existing Three.js-based WebVR project.](https://github.com/stewdio/THREE.VRController)
* [assets/controllers at gh-pages · aframevr/assets · GitHub](https://github.com/aframevr/assets/tree/gh-pages/controllers)
* [Unity - Manual:  Input for OpenVR controllers](https://docs.unity3d.com/Manual/OpenVRControllers.html)
* [Steam VR Template -        Unreal Engine Forums](https://forums.unrealengine.com/development-discussion/vr-ar-development/78620-steam-vr-template?106609-Steam-VR-Template=)
* [Mapping Oculus Controller Input to Blueprint Events](https://developer.oculus.com/documentation/unreal/latest/concepts/unreal-controller-input-mapping-reference/)
* [Events in the Gamepad spec?](https://github.com/w3c/gamepad/pull/15)

## Licence
Per the [LICENSE.md](LICENCE.md) file, this repo is made available under an MIT license and is copyright Amazon 2019.
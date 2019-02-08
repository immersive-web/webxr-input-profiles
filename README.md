# Gamepad mapping
WebXR hardware may support a variety of input sources including motion controllers. When a motion controller is present, developers often wish to do the following:
1. Display the motion controller's virtual model at the correct location
1. Find out the state of the controller's buttons and axes
1. Modify the virtual model to reflect the state of the buttons and axes each render frame
1. Provide a key or legend that explains the mapping of button/axes to actions

In WebXR, the location of an `XRInputSource` is retrieved via the `XRFrame.getPose()` function while the buttons and axes retrieved via a the `XRInputSource.gamepad` attribute.  The [Gamepad API](https://www.w3.org/TR/gamepad/) exposes this information in a `buttons` array and an `axes` array. Until recently, this system has been adequate due to the relative homogenous nature of game console controllers.  This mapping is not adequate for XR motion controllers which have not converged on a common form factor. Furthermore, the gamepad API does not provide a mechanism for retrieving a 3D model representing a gamepad which is necessary for displaying the motion controller on opaque XR headsets.

This repository provides a mechanism to bridge the gap between the available `Gamepad` data and the XR needs enumerate above.  Each folder in the repository is named for a type of `Gamepad` as reported by the `Gamepad.id`. Within each folder is a `.json` file that follows the schema outlined below which maps the raw `Gamepad` data to a 3D asset.  Alongside this file will be one or more asset files that are referenced by the `.json` file. However, to support the widest rendering engine compatibility, it is suggested that asset files be either `.glTF`, `.glb`, `.fbx`, or `.obj`.

## Concepts
> PUT IN A DIAGRAM SHOWING THE RELATIONSHIPS

### Data Sources
> REFER TO BRANDON'S PR ON HOW BUTTONS AND AXES ARE SLOTTED FOR WEBXR
The Gamepad API does not provide an explicit relationship between axes and buttons.  The `dataSources` array mitigates through defining four styles of physical data sources and enumerating the `Gamepad` parts which back them.

#### Button Data Source
The `buttonSource` data source maps directly to the data coming from a single index in the `Gamepad.buttons` array. This mapping is defined by the required `gamepadButtonsIndex` property which represents the index of the backing `GamepadButton` in the `Gamepad.buttons` array.

In addition, this schema adds information about the expected behavior of the button. The first of these additional properties is `buttonSource.supportsTouch` and `buttonSource.supportsPress`.  These values will be `true` by default indicating that the `GamepadButton.touched` and `GamepadButton.pressed` are capable of being `true`. The next additional metadata is `buttonSource.analogValues` which will be `false` by default.  When false, this indicates, per the Gamepad Spec, that the `GamepadButton.value` will always be `1` when `GamepadButton.pressed` is `true` and `0` otherwise. When `buttonSource.analogValues` is true, developers may assume that intermediary values can also be returned.

The following example shows several different button variants.  The first is a trigger style button which will report an analog value based on how hard the user has pressed it.  The second is a menu style button that does not have the ability to report a `touched` status or analog values.  The third is a thumbrest button which can report when it is touched, but will never report being pressed or analog values.

```json
{
    "gamepad" : {
        "dataSources" : [
            {
                "buttonSource" : {
                    "id" : "trigger",
                    "gamepadButtonsIndex" : 0,
                    "analogValues" : true
                },
                "buttonSource" : {
                    "id" : "menu",
                    "gamepadButtonsIndex" : 1,
                    "supportsTouch" : false
                },
                "buttonSource" : {
                    "id" : "thumbrest",
                    "gamepadButtonsIndex" : 2,
                    "supportsPress" : false
                }
            }
        ]
    }
}
```

#### Dpad Data Source
A `dpadSource` data source maps to four separate buttons in the `Gamepad.buttons` array. This mapping is defined by the required `left`, `right`, `up`, and `down` properties of the `gamepadButtonsIndices`.  The values of these properties represent the indices of the backing `GamepadButton` objects in the `Gamepad.buttons` array.

In addition, this schema adds information about the expected behavior of the dpad.  The first of these additional properties is `dpadSource.supportsTouch` which defaults to `false`.  The second of these additional properties is `dpadSource.supportsPress` which defaults to `true`. In order for either of these values to be `true` all the buttons which make up the `dpad` must be capable of reporting `Gamepad.touched` and `Gamepad.pressed` respectively.  The third of these additional properties is `dpadSource.analogValues` which defaults to `false`. When false, this indicates, per the Gamepad Spec, that for all the buttons which make up the `dpadSource` the `GamepadButton.value` will always be `1` when `GamepadButton.pressed` is `true` and `0` otherwise. When `dpadSource.analogValues` is true, developers may assume that for at least one `GamepadButton` that makes up the `dpadSource`, any of the button's intermediary values can also be returned.

The buttons which make up a `dpadSource` are arranged in a particular order and physically connected to one another such that only two adjacent buttons can be `pressed` at the same time.  For example, if a `left` button is pressed it is possible for an `up` or `down` button to also be pressed, but it is not possible for a `right` button to also be pressed.

The following is an example of a `dpadSource`:
```json
{
    "gamepad" : {
        "dataSources" : [
            {
                "dpadSource" : {
                    "id" : "leftHandDpad",
                    "gamepadButtonsIndices" : {
                        "left" : 3,
                        "right" : 4,
                        "up" : 5, 
                        "down" : 6
                    }
                }
            }
        ]
    }
}
```

#### Thumbstick Data Source
A `thumbstickSource` data source maps to two axes in the `Gamepad.axes` array and optionally a button in the `Gamepad.buttons` array.  This mapping is defined by the required `gamepadAxesIndex` in the `xAxis` and `yAxis` properties which represent the indices of the backing entries in the `Gamepad.axes` array.

If present, the `thumbstickSource.button` mostly mirrors the behavior of a `buttonSource` data source.  If `button.supportsTouch` is `true`, the `GamepadButton.touched` property must be `true` when either axis is non-zero.

The following is an example of a `thumbstickSource`:
```json
{
    "gamepad" : {
        "dataSources" : [
            {
                "thumbstickSource" : {
                    "id" : "thumbstick",
                    "xAxisIndex" : 0,
                    "yAxisIndex" : 1,
                    "button" : {
                        "gamepadButtonsIndex" : 7
                    }
                }
            }
        ]
    }
}
```

#### Touchpad Data Source
A `touchpadSource` data source maps to two axes in the `Gamepad.axes` array and optionally a button in the `Gamepad.buttons` array.  This mapping is defined by the required `gamepadAxesIndex` in the `xAxis` and `yAxis` properties which represent the indices of the backing entries in the `Gamepad.axes` array.

If present, the `touchpadSource.button` mostly mirrors the behavior of a `buttonSource` data source.  If `button.supportsTouch` is `true`, the `GamepadButton.touched` property must be `true` when either axis is non-zero.

The following is an example of a `touchpadSource`:
```json
{
    "gamepad" : {
        "dataSources" : [
            {
                "touchpadSource" : {
                    "id" : "touchpad",
                    "xAxisIndex" : 2,
                    "yAxisIndex" : 3,
                    "button" : {
                        "gamepadButtonsIndex" : 8
                    }
                }
            }
        ]
    }
}
```

### Responses
Responses are the virtual manifestations of the physical motion controller's changes.  In order to generically reprsent the range of motion particular controllers allow for their various parts, the virtual models contain nodes representing these ranges. There are six currently defined types of virtual responses to physical motion.

#### Button press
>ADD AN EXPLANATION HERE
```json
{
    "gamepad" : {
        "responses" : [
            {
                "target" : "trigger-transform",
                "max" : "trigger-transform-max"
            }
        ]
    }
}
```

#### Dpad button press
>ADD AN EXPLANATION HERE
```json
{
    "gamepad" : {
        "responses" : [
            {
                "target" : "dpad-transform",
                "left" : "dpad-transform-leftmost",
                "right" : "dpad-transform-rightmost",
                "down" : "dpad-transform-downmost",
                "up" : "dpad-transform-upmost"
            }
        ]
    }
}
```

#### Thumbstick touch
>ADD AN EXPLANATION HERE
```json
{
    "gamepad" : {
        "responses" : [
            {
                "target" : "thumbstick-transform",
                "left" : "thumbstick-transform-leftmost",
                "right" : "thumbstick-transform-rightmost",
                "down" : "thumbstick-transform-downmost",
                "up" : "thumbstick-transform-upmost",
                "max" : "thumbstick-transform-buttonpressed"
            }
        ]
    }
}
```

#### Touchpad press
>ADD AN EXPLANATION HERE
```json
{
    "gamepad" : {
        "responses" : [
            {
                "target" : "touchpad-transform",
                "left" : "touchpad-transform-leftmost",
                "right" : "touchpad-transform-rightmost",
                "down" : "touchpad-transform-downmost",
                "up" : "touchpad-transform-upmost"
            }
        ]
    }
}
```

#### Touchpad touch
>ADD AN EXPLANATION HERE
```json
{
    "gamepad" : {
        "responses" : [
            {
                "target" : "touchpad-touchpoint-transform",
                "left" : "touchpad-touchpoint-transform-leftmost",
                "right" : "touchpad-touchpoint-transform-rightmost",
                "down" : "touchpad-touchpoint-transform-downmost",
                "up" : "touchpad-touchpoint-transform-upmost"
            }
        ]
    }
}
```

### Components
Components are the glue that binds a `dataSource` to the `response` visualizations.  In addition to this mapping, the a component also contains two additional properties.  The first is the `root` representing the top-most node of the motion controller part in the asset file. The second is the `labelTransform` representing the point relative to the asset at which it would be safe to place text explaining the usage of the motion controller part.

For example, here is a gamepad with a single touchpad:
```json
{
    "gamepad" : {
        "components" : [
            {
                "dataSource" : 4,
                "root" : "touchpad-root",
                "labelTransform" : "touchpad-label-transform",
                "pressResponse" : 1,
                "touchResponse" : 0
            }
        ],
        "dataSources" : [
            {
                "touchpadSource" : {
                    "id" : "touchpad",
                    "xAxisIndex" : 0,
                    "yAxisIndex" : 1,
                    "button" : {
                        "gamepadButtonsIndex" : 0
                    }
                }
            }
        ],
        "responses" : [
            {
                "touchpadTouch" : {
                    "target" : "touchpad-touchpoint-transform",
                    "left" : "touchpad-touchpoint-transform-leftmost",
                    "right" : "touchpad-touchpoint-transform-rightmost",
                    "down" : "touchpad-touchpoint-transform-downmost",
                    "up" : "touchpad-touchpoint-transform-upmost",
                }
            },
            {
                "touchpadPress" : {
                    "target" : "touchpad-transform",
                    "left" : "touchpad-transform-leftmost",
                    "right" : "touchpad-transform-rightmost",
                    "down" : "touchpad-transform-downmost",
                    "up" : "touchpad-transform-upmost",
                }
            }
        ]
    }
}
```

### Hands
Hands are the binding of individual components into motion controllers

#### Handed controllers
For motion controllers that report a handedness property
```json
{
    "gamepad" : {
        "id" : "motion-controller-id",
        "hands" : {
            "left" : {
                "asset" : "some-url",
                "root" : "left-hand-controller",
                "componentIds" : [0],
                "primaryButtonComponent" : 0,
            },
            "right" : {
                "asset" : "some-url",
                "root" : "right-hand-controller",
                "componentIds" : [0],
                "primaryButtonComponent" : 0,
                "primaryAxesComponent" : 0
            }
        },
        "components" : [
            {
                "dataSource" : 0,
                "root" : "button-root",
                "labelTransform" : "button-label-transform",
                "pressResponse" : 0
            }
        ],
        "dataSources" : [
            {
                "button" : {
                    "id" : "mainButton",
                    "gamepadButtonsIndex" : 0
                }
            }
        ],
        "responses" : [
            {
                "target" : "mainButton-transform",
                "max" : "mainButton-transform-max"
            }
        ]
    }
}
```

#### Unhanded controllers
For motion controllers than can't distinguish right vs left
```json
{
    "gamepad" : {
        "id" : "motion-controller-id",
        "hands" : {
            "neutral" : {
                "asset" : "some-url",
                "root" : "neutral-hand-controller",
                "componentIds" : [0],
                "primaryButtonComponent" : 0,
                "primaryAxesComponent" : 0
            }
        },
        "components" : [
            {
                "dataSource" : 0,
                "root" : "thumbstick-root",
                "labelTransform" : "thumbstick-label-transform",
                "touchResponse" : 0
            }
        ],
        "dataSources" : [
            {
                "thumbstickSource" : {
                    "id" : "thumbstick",
                    "xAxisIndex" : 0,
                    "yAxisIndex" : 1,
                    "button" : {
                        "gamepadButtonsIndex" : 0
                    }
                }
            }
        ],
        "responses" : [
            {
                "target" : "thumbstick-transform",
                "left" : "thumbstick-transform-leftmost",
                "right" : "thumbstick-transform-rightmost",
                "down" : "thumbstick-transform-downmost",
                "up" : "thumbstick-transform-upmost",
                "max" : "thumbstick-transform-buttonpressed"
            }
        ]
    }
}
```

## User-agent overrides
> NOTE: This section is totally not designed
```js
{
    "version" : "0.1",
    "gamepad" : {},
    "user-agent-overrides" : [
        {
            "userAgentString" : "some-UA",
            "minVersion" : 1.0,
            "maxVersion" : 2.0,
            "dataSource" : 0,
            "button" : {
                "defaultValue" : 0,
                "min" : 0,
                "max" : 2
            }
        }
    ]
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
Per the [LICENSE.md](LICENCE.md) file:
> All documents in this Repository are licensed by contributors under the [W3C Software and Document License](https://www.w3.org/Consortium/Legal/copyright-software).

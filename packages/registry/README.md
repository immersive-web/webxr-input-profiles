# WebXR Input Profiles Registry

This package contains information for User Agents ensure they expose consistent intrinsic values for all WebXR `XRInputSource` objects. For each hardware device, this information currently includes:
* The profile id
* The ordered list of fallback profile ids as specified in the [WebXR Device API](https:www.w3.org/tr/webxr)
* The allowable `XRInputSource.handedness` values
* The component layouts for each `handedness` value
* The component responsible for causing `select`, `selectstart`, and `selectend` events to fire
* The presence of a non-null `XRInputSource.gamepad`. When non-null:
  * The appropriate `Gamepad.mapping` value
  * The relationship between physical hardware components (e.g. triggers, grips, buttons, touchpads, and thumbsticks) to indices in the `XRInputSource.gamepad.buttons` array.
  * The relationship between physical touchpads and thumbsticks to indices in the `XRInputSource.gamepad.axes` array.

## Profile prefixes
Each profile id is required to start with a vendor prefix as stated in the [WebXR Device API](https://www.w3.org/tr/webxr).

### Generic prefix
The "*generic*" prefix is reserved for all profiles not associated with a specific vendor

### Vendor prefixes
The following prefixes are reserved for companies with XR hardware
* *google* - [Google](https://www.google.com)
* *htc* - [HTC](https://www.htc.com/)
* *magicleap* - [Magic Leap](https://www.magicleap.com/)
* *microsoft* - [Microsoft Corp](https://www.microsoft.com/)
* *oculus* - [Oculus Corp](https://www.oculus.com/)
* *samsung* - [Samsung](https://www.samsung.com)
* *valve* - [Valve Corporation](https://www.valvesoftware.com/en/)

### Reserving a prefix
To reserve a new vendor prefix, file a pull request with the following template:
https://github.com/immersive-web/webxr-input-profiles/issues/51

## Profiles
All profiles are located under the './profiles' folder in a subfolder for each vendor prefix. These profiles are bundled during as part of the package build step, but are not modified.

### Adding a profile
Ensure that the desired profile prefix has been reserved by following the [instructions](#reserving-a-prefix) for doing so.

The new profile JSON file must be conformant with the schema in the './schemas' folder.  It must also pass the verification steps performed as part of the package build.

### Building
In general, this package should be built and tested from the root of the repository using the following command:
> npm run test

To build just this package without running tests, invoke the following command from the root of the repository:
> npm run build -- --scope @webxr-input-profiles/registry

### Filing a bug
Fill in the steps for filing a bug https://github.com/immersive-web/webxr-input-profiles/issues/52

### Filing a pull request
Fill in the steps for filing a pull request https://github.com/immersive-web/webxr-input-profiles/issues/52

## Schema

![Diagram of top-level schema parts](./figures/Concepts.png)

### Profile id and fallback profile ids
Profiles are required to have a `profileId` that uniquely identifies the profile and must conform to the format specified by the [WebXR Device API](http://www.w3.org/tr/webxr). Profiles are also required to have a `fallbackProfileIds` array containing profile ids that are considered acceptable substitutes for profile. This array may be empty, but, if it is not, the ids it contains must match another existing profile detailed in this repository. 

For example
```json
{
    "profileId" : "vendorprefix-profileId",
    "fallbackProfileIds" : ["vendorprefix-otherProfileId", "generic-thumbstick"]
}
```

The `XRInputSource.profiles` array is comprised of these two properties; the `profileId` is the first element followed by the elements in the `fallbackProfileIds` property.

### Layouts
Profiles are required to have a `layouts` property which contains the layouts for each supported `handedness`. The `layouts` property must have one, and only one, of the following arrangements of keys to be considered valid:
* `none`
* `left` and `right`
* `left` and `right` and `none`
* `left-right`
* `left-right` and `none`
* `left-right-none`

For example:
```json
{
    "layouts": {
        "none" : {},
        "left-right": {}
    }
}
```
### Components
Each layout is required to have a `components` property which contains information about all the individual parts of an `XRInputSource`. Components are comprised of a key which uniquely identifies them and a which describes their behavior. Component keys must not contain spaces at the beginning or end. Currently, the valid types are: `trigger`, `grip`, `touchpad`, `thumbstick`, and `button`

Each layout is also required to have a `selectSource` property which refers to an entry in the `components` object. This component will cause the WebXR `select`, `selectStart`, and `selectEnd` events to fire.

For example:
```json
{
    "layouts": {
        "left-right": {
            "selectSource": "my-hardware-trigger-name",
            "components": {
                "my-hardware-trigger-name": { "type": "trigger" },
                "my-hardware-touchpad-name": { "type": "touchpad" }
            }
        }
    }
}
```

### Gamepads
If an `XRInputSource` will have a non-null `XRInputSource.gamepad`, the profile must contain information which allows all User Agents to report identical data in `Gamepad.mapping`, `Gamepad.buttons`, and `Gamepad.axes`.  These details are enumerated in the layout's `gamepad` property.

The `gamepad.mapping` string must follow the rules laid out in the [WebXR Gamepads Module](https://www.w3.org/tr/webxr-gamepads-module). The `gamepad.buttons` propety is an array which matches index-for-index with the web platform's `Gamepad.buttons` array. Each index contains either null or the id of the component from which the data must be populated. The `gamepad.axes` property is an array which matches index-for-index with the web platform's `Gamepad.axes` array. Each index contains either null or the combination of component id and axis from which the data must be populated.

For example:
```json
{
    "layouts": {
        "left-right": {
            "components": {
                "my-hardware-trigger-name": { "type": "trigger" },
                "my-hardware-touchpad-name": { "type": "touchpad" }
            },
            "gamepad" : {
                "mapping" : "xr-standard",
                "buttons" : [
                    "my-hardware-trigger-name",
                    null,
                    "my-hardware-touchpad-name"
                ],
                "axes" : [
                    { "componentId": "my-hardware-touchpad-name", "axis":"xAxis"},
                    { "componentId": "my-hardware-touchpad-name", "axis":"yAxis"}
                ]
            }
        }
    }
}

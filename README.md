# WebXR Input Profiles

## Motivation
Explain what WebXR is and how its different from WebVR https://github.com/immersive-web/webxr-input-profiles/issues/49

Define motion controllers https://github.com/immersive-web/webxr-input-profiles/issues/50

When a motion controller is present on XR hardware, developers often wish to do the following:
1. Display the motion controller's virtual model at the correct location
1. Find out the state of the controller's component parts (made up of buttons and axes)
1. Modify the virtual model to reflect the state of the components each render frame
1. Provide a key or legend that explains the mapping of components to actions

The state of an XR motion controller's buttons, thumbsticks, dpads, and touchpads is made available to developers via a `Gamepad` object, as defined by the [Gamepad API](https://www.w3.org/TR/gamepad/). This data is divided up and populated in the `Gamepad.buttons` array and the `Gamepad.axes` array. While this system was adequate for the relatively homogenous console gaming controllers, it breaks down for XR motion controllers as they have not yet converged on a common form factor. In addition, the [Gamepad API](https://www.w3.org/TR/gamepad/) does not provide any information about the visualization of a `Gamepad` object which is a requirement to displaying a virtual copy of motion controller on opaque XR headsets.

## Overview
This repository defines a JSON schema to bridge the gap between the needs listed above and the abstract data reported by `Gamepad` objects. For each known motion controller, there is a folder in this repository at `./profiles/<profile.id>/`.  In this folder are assets and a `profile.json` file which enumerates how to interpret the `Gamepad` data and bind it to the assets. Assets are available under MIT license in .glTF, .glB, or .fbx formats.

## Design Goals
This repository has been designed to meet the following goals:
* *Distributable and modifiable.* The content in this repository is available under MIT licence.  Take this schema and modify it for your own purposes.
* *Forward compatible.* The schema, validation tests, and tools are designed to make it straightforward to submit a pull request with new profiles and assets as new XR hardware comes on the market.  Additionally, fallback assets and profiles are included to handle unknown motion controllers.
* *WebXR optimized, WebVR compatible.* While WebVR is still available in several user agents, the future of XR on the web is in the standards-track API, WebXR. As such, when faced with tradeoffs, the design was optimized to simplify the schema and library for WebXR usage while still maintaining a path for WebVR usage.

## Adding New Hardware
Fill in the steps for adding a folder for a new XR device, testing the change, and submitting for PR https://github.com/immersive-web/webxr-input-profiles/issues/51

## Filing A Bug
Fill in the steps for filing a bug https://github.com/immersive-web/webxr-input-profiles/issues/52

## Profile Viewer
This repository also contains a page that allows for easy testing and viewing of the devices described by each profile. It renders the assets described by the profile and allows emulated manipulation of each of the inputs in order to see the rendered response. Currently the page is limited to only visualizing profiles already comitted to the repository, but [additional features](https://github.com/immersive-web/webxr-input-profiles/issues/59) to make it more useful during the development of profiles are planned.

[Open the Profile Viewer](https://immersive-web.github.io/webxr-input-profiles/profileViewer/)

# Developer usage
This repo provides a javascript library for managing known motion controller profiles, loading the most ideal known profile for a supplied input source, and creating a MotionController object that binds them together.  Developers can use this library to interact with the conceptual components of an input source, rather than each individual button or axis.

## Getting started
To install this library and the associated profiles:
```
npm install webxr-input-profiles
```

To use this library, first initialize a `Profiles` object with the path to a folder containing the profiles. You'll probably want to copy the profiles from the module's `profiles/` folder as part of your application deployment.
```js
const profiles = new Profiles('URI of folder with profiles and assets');
```
On the first request to load a profile, the class retrieves the list of known profiles from the supplied URI and caches it for use on subsequent requests.

## Creating a MotionController
As input sources are added and removed, developers can monitor the related events and create a `MotionController` by invoking `Profiles.createMotionController()`.

### WebXR connection and disconnection
WebXR reports input sources being connected and disconnected via the `XRSession.inputsourceschange` event. Developers should register for this event and respond by requesting a `MotionController` be created. This will check the `XRInputSource.getProfiles()` list to find the best match.  If found, the library will load the 3D asset and fullfil the promise with a new `MotionController` object.

```js
import { Profiles } from './webxr-input-profiles.module.js';
const profiles = new Profiles('the URI where profiles and assets are hosted');

let xrMotionControllers = {};
xrSession.addEventListener('inputsourceschange', onInputSourcesChange);

function onInputSourcesChange(event) {
  event.added.forEach((inputSource) => {
    profiles.createMotionController(inputSource).then((motionController) => {
      xrMotionControllers[inputSource] = motionController;
    });
  }

  event.removed.forEach((inputSource) => {
    if (xrMotionControllers[inputSource]) {
      delete xrMotionControllers[inputSource];
    }
  });
}
```

### WebVR connection and disconnection
WebVR reports input sources being connected and disconnected by the `navigator.gamepadconnected` and `navigator.gamepaddisconnected` events respectively. In order to use this library, a `MockXRInputSource` must be created using the newly detected `Gamepad`.  The `Gamepad.id` will be treated as the single allowable profile returned by `MockXRInputSource.getProfiles()`.

```js
import { MockXRInputSource } from './webxr-input-mocks.module.js';
import { Profiles } from './webxr-input-profiles.module.js';
const profiles = new Profiles('the URI where profiles and assets are hosted');

let xrMotionControllers = {};
navigator.addEventListener('gamepadconnected', onGamepadConnected);
navigator.addEventListener('gamepaddisconnected', onGamepadDisconnected);

function onGamepadConnected(event) {
  const gamepad = event.gamepad;
  if (gamepad.displayId) {
    const mockInputSource = new MockXRInputSource(gamepad);

    profiles.createMotionController(mockInputSource).then((motionController) => {
        xrMotionControllers[gamepad] = motionController;
    });
  }
}

function onGamepadDisconnected(event) {
  if (xrMotionControllers[event.gamepad]) {
      delete xrMotionControllers[event.gamepad];
    }
  }
}
```

## Components

### Button component
A `Button` component is always in the `pressed` state if the associated `GamepadButton.pressed` is `true`.  Some buttons may not support the pressed state, such as the thumbrest on the original Oculus Touch controller. If the pressed state is allowed, the `Button` will also be set to it if the `GamepadButton.value` equals `1.0`.

A `Button` component is in the `default` state if the associated `GamepadButton.touched` and the `GamepadButton.pressed` are both `false` and the `GamepadButton.value` is below `0.01`.

Otherwise, the `Button` component is in the `touched` state.  This may be because the associated `GamepadButton.touched` is `true` and the `GamepadButton.pressed` is false.  It may also be because the `GamepadButton.value` is between `0.01` and `1.0` while the `GamepadButton.pressed` is `false`.

The `Button.buttonValue` always comes directly from the `GamepadButton.value`. 

```js
import { Constants } from './webxr-input-profiles.module.js';
function processTriggerInput(triggerButton) {
  if (triggerButton.state === Constants.ComponentState.PRESSED) {
    // Fire ray gun
  } else if (triggerButton.state === Constants.ComponentState.TOUCHED) {
    const chargeLevel = triggerButton.buttonValue;
    // Show ray gun charging up
  }
}
```

### Thumbstick and touchpad components
Though `Thumbstick` and `Touchpad` components are often used for different interactions (e.g. thumbsticks are often preferred for teleportation), they share common behavior and can collectively be referred to as `Axes` components. An `Axes` component will always have an `xAxis` value which is `-1.0` at the far left of its range of motion and `1.0` at the far right. An `Axes` component will also always have a `yAxis` value which is `-1.0` at the top of its range of motion and `1.0` at the bottom.  An `Axes` component may have a `buttonValue`, such as when a touchpad or thumbstick are clickable.

If an `Axes` component is clickable, its state will mostly behave identically to a `Button` component. The only difference is when the component would otherwise be in the `default` state. In that case, an `xAxis` or `yAxis` value greater than `0.1` will cause the component to report the`touched` state.

```js
import { Constants } from './webxr-input-profiles.module.js';
function processThumbstickInput(thumbstick) {
  if (thumbstick.state === Constants.ComponentState.PRESSED) {
    // Align the world orientation to the user's current orientation
  } else if (thumbstick.state === Constants.ComponentState.TOUCHED
             && thumbstick.yAxis !== 0) {
    const scootDistance = thumbstick.yAxis * scootIncrement;
    // Scoot the user forward
  }
}
```

## Visual representation

### Loading the asset
The visualization asset representing a motion controller can loaded once the `MotionController` has been created. The path to the asset can be found in the `MotionController.assetPath`. Assets are available under MIT license in .glTF, .glB, or .fbx formats.

```js
profiles.createMotionController(inputSource).then((motionController) => {
  await MyEngine.loadAsset(motionController.assetPath, (asset) => {
    MyEngine.scene.add(asset);
  });
});
```

### Touch dot
Touchpads have an additional property that enables visualizing the point at which they are touched. To use this property, attach your visualization to the `Touchpad.touchDotNodeName` when the asset is loaded.

```js
function addTouchDots() {
  Object.values(motionController.components).forEach((component) => {
    const motionControllerRoot = MyEngine.scene.getChildByName(motionController.root);
    if (component.dataSource.dataSourceType === 'touchpadSource') {
      const componentRoot = motionControllerRoot.getChildByName(component.rootNodeName, true);
      const touchDotRoot = componentRoot.getChildByName(component.touchDotNodeName, true);
      
      const sphereGeometry = new THREE.SphereGeometry(0.001);
      const material = new THREE.MeshBasicMaterial({ color: 0x0000FF });
      const sphere = new THREE.Mesh(sphereGeometry, material);
      touchDotRoot.add(sphere);
    }
  });
}
```

### Animating components
On each frame, the motion controller data must be retrieved from the input source, and the rendering engine must respond accordingly to the new button/axis data. This the same for both WebXR and WebVR

```js
function onXRFrame(xrFrame) {
  // Other frame-loop stuff ...
  
  Object.values(xrMotionControllers).forEach((motionController) => {
    updateMotionControllerParts(motionController);
  });

  // Other frame-loop stuff ...
}

function updateMotionControllerParts(motionController) {
  // Cause the MotionController to poll the Gamepad for data
  motionController.updateFromGamepad();

  // Update the 3D model to reflect the button, thumbstick, and touchpad state
    const motionControllerRoot = MyEngine.scene.getChildByName(motionController.root);
  Object.values(motionController.components).forEach((component) => {
    const componentRoot = motionControllerRoot.getChildByName(component.rootNodeName);
    component.visualResponses.weightedNodes.forEach((weightedNode) => {
      // Find the topmost node in the visualization
      let visualResponseRoot = motionControllerRoot.getChildByName(weightedNode.rootNodeName, true);
      const targetNode = visualResponseRoot.getChildByName(weightedNode.targetNodeName);

      // Calculate the new properties based on the weight supplied
      if (weightedNode.property === 'visibility') {
        targetNode.visible = weightedNode.value;
      } else if (weightedNode.property === 'transform') {
        const minNode = visualResponseRoot.getObjectByName(weightedNode.minNodeName);
        const maxNode = visualResponseRoot.getObjectByName(weightedNode.maxNodeName);
        targetNode.transform = MyEngine.interpolateTransform(
          minNode, 
          maxNode, 
          weightedNode.value);
      }
    });
  });
}
```

## Update pose

On each frame, the position and orientation of motion controllers must be queried.  These poses can be divided into a grip pose, representing the center of the motion controller, and a target ray, representing the ray from which the controller can be used to select items. Querying this data is done differently for WebXR and WebVR.

### WebXR poses
To get the grip pose, pass the `MotionController.gripSpace` into `XRFrame.getPose()`.

```js
function updateGripPose(xrFrame, motionController) {
  const motionControllerRoot = MyEngine.findEntityByName(motionController.root);
  const pose = xrFrame.getPose(motionController.gripSpace, xrReferenceSpace);
  MyEngine.setTransform(motionControllerRoot, pose);
  return ray;
}
```

To get the target ray, pass the `MotionController.targetRaySpace` into `XRFrame.getPose()` and transform the result into a ray.

```js
function getTargetRay(xrFrame, motionController) {
  const pose = xrFrame.getPose(motionController.targetRaySpace, xrReferenceSpace);
  const ray = MyEngine.convertPoseToRay(pose);
  return ray;
}
```

### WebVR poses
Figure out how to align this with the WebVR polyfill https://github.com/immersive-web/xr-gamepad-mappings/issues/53

To update the motion controller's location...

In WebVR there is no implicit mechanism for retrieving a target ray origin.  Instead, it must be retrieved from the the profile via the `XRGamepad` and multiplied by the `Gamepad` object's pose in matrix form.
```js
function getTargetRayOrigin(xrGamepad){
  let targetRayOrigin;

  const gamepadPose = xrGamepad.gamepad.gamepadPose;
  if (gamepadPose && gamepadPose.hasOrientation && gamepadPose.hasPosition) {
    const gamepadPoseMatrix = new MyMatrixMathLibrary.RigidTransform(gamepadPose.position, gamepadPose.orientation);
    targetRayOrigin = MyMatrixMathLibrary.Multiply(gamepadPoseMatrix, xrGamepad.targetRayOrigin);
  }

  return targetRayOrigin;
}
```

# Profile schema and JSON
![Diagram of top-level schema parts](./figures/Concepts.png)

## Version and id
Each schema file must contain a `version` and `id`.  The `version` property is a semantic version made up of major and minor version parts.  The major and minor version parts must always be up to date with the library being used to parse the profile file.  The `id` property must match the folder the JSON file and assets are contained in. For WebXR input sources, the `id` will be one of the profile names returned by `XRInputSource.getProfiles()`. 

```json
{
    "version" : "0.1",
    "id" : "motion-controller-id"
}
```

For WebVR input sources, the `id` must be a string prefixed with 'WebVR ' followed by the `Gamepad.id` string. A `webVR` property set to `true` is also required.

```json
{
    "version" : "0.1",
    "id" : "WebVR motion-controller-id",
    "webVR" : true
}
```

## Handedness
The `handedness` object contains definitions for `left`, `right`, and/or `none` motion controlLer form factors. Each of these children contains all information necessary to interact with and render a single motion controller. The `handedness` object must be populated by properties in one of the following configurations:

* *`left` and `right`.* This option should be used when the underlying XR platform is expected to always report a handedness.  This may be because the motion controllers are intrinsically unique such as the Oculus Touch.  It may also be due to a system-level configuration setting which causes an intrinsically unhanded controller to report itself as either left or right such as the Google Daydream Controller.
* *`none`.* This option should be used for motion controllers which are incapable of reporting handedness.  It does not imply that only one motion controller will be tracked at a time.
* *`none`, `left`, and `right`.* This option should be used for motion controllers that are capable of but not guaranteed to report handedness. For example, HTC Vive Controllers are not intrinsically handed, but the underlying XR system is able to interpret usage based on relative position over time.  As a result, these controllers are capable of reporting all three types of handedness.

All three of these properties are the same type and must contain an `asset`, a `root`, and a `components` property.  The `asset` property points to a .glTF or .glB file representing the motion controller; extensions will be made available for additional file formats.  The `root` property references the topmost node in the asset hierarchy associated with the motion controller.  The `components` array must not be empty and contains indices into the file's `components` array. The `selectionComponent` indicates which component will cause the `select`, `selectstart`, and `selectend` WebXR input events to fire.

For example:

```json
{
    "handedness" : {
        "none" : {
            "asset" : "some-url",
            "root" : "none-handedness-controller",
            "components" : [0],
            "selectionComponent": 0
        }
    }
}
```

## Components
Components represent buttons, thumbsticks, and touchpads. A component must contain a `dataSource` property which is an index into the profile's `dataSource` array. The data source at that index is the one that provides the component's data. A component must also contain a `root` property containing the name of the component's root node in the motion controller model.

```json
{
    "components" : [
        {
            "dataSource" : 4,
            "root" : "trigger-root",
        }
    ]
}
```

A component also optionally provide a `labelTransform` which is filled in with the name of a node in the motion controller hierarchy at which a description of component behavior has safely be attached without intersecting the 3D model.  

```json
{
    "components" : [
        {
            "dataSource" : 4,
            "root" : "trigger-root",
            "labelTransform" : "trigger-label-node"
        }
    ]
}
```

Components may also optionally contain an array of indices in the `visualResponses` property. These are indices into the profile's `visualResponses` array in which animations are described for the button, thumbstick, and touchpad movement. (For more information see [Visual responses](#visual-responses))

For example:

```json
{
    "components" : [
        {
            "dataSource" : 4,
            "root" : "trigger-root",
            "labelTransform" : "trigger-label-node",
            "visualResponses" : [0, 3]
        }
    ]
}
```

## Data sources
The [Gamepad API](https://www.w3.org/TR/gamepad/) communicates the state of buttons and axes via the `Gamepad.buttons` array and the `Gamepad.axes` array. Elements in the schema's `dataSources` array describe which indices represent the buttons and axes associated with a component. Each `dataSource` must contain a unique `id` and a `dataSource` type set to `buttonSource`, `thumbstickSource` or `touchpadSource`.  

### Button data sources
If the `dataSource` is a `buttonSource` it must also contain a `buttonIndex` representing an element in the `Gamepad.buttons` array.

```json
{
    "dataSources" : [
        {
            "id" : "gripButton",
            "dataSourceType" : "buttonSource",
            "buttonIndex" : 2
        }
    ]
}
```

When representing an analog button such as a trigger, the `analogValues` property must be present and set to `true`.  For example:

```json
{
    "dataSources" : [
        {
            "id" : "triggerButton",
            "dataSourceType" : "buttonSource",
            "buttonIndex" : 0,
            "analogValues" : true
        }
    ]
}
```

When representing a button that can report a touched state but not a pressed state (eg. the thumbrest on the Oculus Touch), the `pressUnsupported` property must be present and set to `true`.  For example:

```json
{
    "dataSources" : [
        {
            "id" : "thumbrest",
            "dataSourceType" : "buttonSource",
            "buttonIndex" : 5,
            "pressUnsupported" : true
        }
    ]
}
```

### Touchpads and thumbsticks
If the `dataSource` is a `thumbstickSource` or a `touchpadSource`, it must contain an `xAxisIndex` and a `yAxisIndex` representing the elements in the `Gamepad.axes` array.
```json
{
    "dataSources" : [
        {
            "id" : "touchpad",
            "type": "touchpadSource",
            "xAxisIndex" : 0,
            "yAxisIndex" : 1
        }
    ]
}
```

Some thumbsticks and touchpads may be able to be depressed or they may also have a center deadzone in which axis data isn't reported but a "touched" status is.  In both cases, the data source must also include a `buttonIndex` property with a value representing the index in the `Gamepad.buttons` array at which to find the button's data. On touchpads with a dpad-like physical behavior, the x-axis and y-axis values can be used to determine which quadrant(s) are being pressed. For example:

```json
{
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
```

If the thumbstick or touchpad is able to be depressed in an analog manner, the data source must also include an `analogButtonValues` property with a value of `true`.  If the thumbstick or touchpad is capable of reporting a deadzone "touched" status but cannot be pressed, the data source must also include a `pressUnsupported` property with a value of `true`.

## Visual responses
The visual representation of a motion controller in a VR must respond to reflect its physical state in the real-world.  For example, when a physical thumbstick is moved to the left, the virtual thumbstick should also move to the left.  The `visualResponses` array contains descriptions of all visual changes that can occur when a controller part is interacted with.

Each element in this array must contain a `rootNodeName` property which references the node containing the rest of the nodes needed for the visualization. It must also contain a `source` property set to one of four values: `buttonValue`, `xAxis`, `yAxis`, or `state`.  This indicates which component property will be used to drive the visualization.  Lastly, the element must contains a `states` array which indicates the component states for which the visualization will apply.

```json
{
    "visualResponses" : [
        {
            "rootNodeName": "THUMBSTICK_X",
            "source": "xAxis",
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
            "source": "xAxis",
            "states": ["default", "touched", "pressed"],
            "targetNodeName": "TARGET"
        }
    ]
}
```

By default, visualizations with a `source` of `xAxis` or `yAxis` will use `"MIN"` and `"MAX"` the names of the nodes representing the extents of axis motion. Visualizations with a `source` of `buttonValue` or `state` default their extents nodes to be named `UNPRESSED` and `PRESSED` respectively.  To override these node names in both cases, supply an alternative `minNodeName` and `maxNodeName`.

```json
{
    "visualResponses" : [
        {
            "rootNodeName": "THUMBSTICK_X",
            "source": "xAxis",
            "states": ["default", "touched", "pressed"],
            "minNodeName": "LEFT",
            "maxNodeName": "RIGHT"
        }
    ]
}
```

When a visualization is toggling a node's visibility, the `source` must be set to `state` and the additional `property` property set to `visibility`.

```json
{
    "visualResponses" : [
        {
            "rootNodeName": "TOUCH_DOT",
            "source": "state",
            "states": ["touched", "pressed"],
            "property": "visibility"
        }
    ]
}
```

### Thumbstick visual response example
Commonly, the visual responses for a thumbstick will be as follows:
```json
{
    "visualResponses": [
        {
            "rootNodeName": "THUMBSTICK_PRESS",
            "source" : "state",
            "states" : ["pressed"]
        },
        {
            "rootNodeName": "THUMBSTICK_X",
            "source" : "xAxis",
            "states" : ["default", "touched", "pressed"]
        },
        {
            "rootNodeName": "THUMBSTICK_Y",
            "source" : "yAxis",
            "states" : ["default", "touched", "pressed"]
        }
    ]
}
```

### Touchpad visual response values
Commonly, the visual responses for a touchpad will be as follows:
```json
{
    "visualResponses": [
        {
            "rootNodeName": "TOUCHPAD_PRESS",
            "source" : "state",
            "states" : ["pressed"]
        },
        {
            "rootNodeName": "TOUCH",
            "source" : "state",
            "states" : ["touched", "pressed"],
            "property": "visibility"
        },
        {
            "rootNodeName": "TOUCHPAD_TOUCH_X",
            "source" : "xAxis",
            "states" : ["default", "touched", "pressed"]
        },
        {
            "rootNodeName": "TOUCHPAD_TOUCH_Y",
            "source" : "yAxis",
            "states" : ["default", "touched", "pressed"]
        }
    ]
}
```
### Button visual response values
Commonly, the visual response for an analog button, such as a trigger, will be as follows:
```json
{
    "visualResponses": [
        {
            "rootNodeName" : "SELECT",
            "source" : "buttonValue",
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
            "source" : "state",
            "states" : ["pressed"]
        }
    ]
}
```

## Additional WebVR properties
### Target ray origin
The WebXR API communicates the origin of a motion controller's targeting ray through the `XRInputSource.targetRaySpace`, but the WebVR API does not have any mechanism to communicate the same concept.  To account for this, WebVR motion controllers assets must contain an additional node to indicate the location of the targeting ray's origin relative to the motion controller's root. This node must be referenced in the `handedness` descriptions by including the `webVR_targetRayOrigin` property.

```json
{
    "webVR": true,
    "handedness": {
        "none": {
            "asset" : "some-url",
            "root" : "none-handedness-controller",
            "webVR_targetRayOrigin": "target-ray-origin-node",
            "components" : [0],
            "selectionComponent" : 0,
            "primaryAxisComponent" : 1
        }
    }
}
```

### Axis inversion
Certain WebVR `Gamepad` objects have some components with an inverted `yAxis` causing positive values at the top of its range of motion and negative ones at the bottom.  Profiles indicate this, or an inverted `xAxis`, on a `dataSource` by setting the `webVR_yAxisInverted` or `webVR_xAxisInverted` to true respectively.

```json
{
    "webVR": true,
    "dataSources" : [
        {
            "id": "invertedThumbstick",
            "buttonIndex": 0,
            "xAxisIndex": 0,
            "yAxisIndex": 1,
            "webVR_yAxisInverted": true
        },
        {
            "id": "invertedThumbstick2",
            "xAxisIndex": 2,
            "yAxisIndex": 3,
            "webVR_xAxisInverted": true
        }
    ]
}
```

# Asset requirements
TODO

# Appendices

## Licence
Per the [LICENSE.md](LICENCE.md) file, this repository is made available under an MIT license and is copyright Amazon 2019.

## Supported hardware
Fill this in https://github.com/immersive-web/xr-gamepad-mappings/issues/54

## References
* [GitHub - stewdio/THREE.VRController: Support hand controllers for Oculus, Vive, Windows Mixed Reality, Daydream, GearVR, and more by adding VRController to your existing Three.js-based WebVR project.](https://github.com/stewdio/THREE.VRController)
* [assets/controllers at gh-pages · aframevr/assets · GitHub](https://github.com/aframevr/assets/tree/gh-pages/controllers)
* [Unity - Manual:  Input for OpenVR controllers](https://docs.unity3d.com/Manual/OpenVRControllers.html)
* [Steam VR Template -        Unreal Engine Forums](https://forums.unrealengine.com/development-discussion/vr-ar-development/78620-steam-vr-template?106609-Steam-VR-Template=)
* [Mapping Oculus Controller Input to Blueprint Events](https://developer.oculus.com/documentation/unreal/latest/concepts/unreal-controller-input-mapping-reference/)
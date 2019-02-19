const Constants = require("./constants.js");

/**
  * @description This class connects a component, as described in a mapping.json file,
  * with a Gamepad object, as defined by https://www.w3.org/TR/gamepad/
  * @author Nell Waliczek / https://github.com/NellWaliczek
*/
class XRGamepadComponent {

  /**
   * @param {Gamepad} gamepad - The Gamepad object provided by the user agent
   * @param {dictionary} mapping - The mapping file text in dictionary form
   * @param {integer} componentIndex - The index of the component in the mapping file's components array
   */
  constructor(gamepad, mapping, componentIndex) {
    if (!gamepad || !mapping || componentIndex === undefined) {
      throw new Error("Cannot create XRGamepadComponent from invalid parameters");
    }

    if (componentIndex < 0 || componentIndex >= mapping.components.length) {
      throw new Error(`Component index ${componentIndex} is outside array boundaries`);
    }

    this.gamepad = gamepad;
    this.component = mapping.components[componentIndex];
    this.dataSource = mapping.dataSources[this.component.dataSource];
    this.visualResponses = [];
    this.buttons = {}
    this.axes = {};

    // Helper function to validate and track axis reference
    let addAxis = (name, key) => {
      let index = this.dataSource[key];
      if (index >= this.gamepad.axes.length) {
        throw new Error(`Gamepad '${this.xrGamepad.id}' has no ${name} at index ${index}`);
      }
      this.axes[name] = index;
    };

    // Helper function to validate and track button reference
    let addButton = (name, key) => {
      let index = this.dataSource[key];
      if (index >= this.gamepad.buttons.length) {
        throw new Error(`Gamepad '${this.xrGamepad.id}' has no button ${name} at index ${index}`);
      }
      this.buttons[name] = index;
    };

    // Create references to buttons and axes to track
    switch(this.dataSource.dataSourceType) {
      case Constants.DataSourceType.DPAD_FROM_BUTTONS:
        addButton("left", "leftButtonIndex");
        addButton("right", "rightButtonIndex");
        addButton("top", "topButtonIndex");
        addButton("bottom", "bottomButtonIndex");
        break;
      case Constants.DataSourceType.DPAD_FROM_AXES:
      case Constants.DataSourceType.THUMBSTICK:
      case Constants.DataSourceType.TOUCHPAD:
        addAxis("xAxis", "xAxisIndex");
        addAxis("yAxis", "yAxisIndex");
        if (this.dataSource.buttonIndex != undefined) {
          addButton("button", "buttonIndex");
        }
        break;
      case Constants.DataSourceType.BUTTON:
        addButton("button", "buttonIndex");
        break;
      default:
        throw new Error(`DataSourceType ${this.dataSource.dataSourceType} not recognized`);
    }

    // Get references to the component's visual response descriptions
    if (this.component.visualResponses) {
      this.component.visualResponses.forEach((visualResponseIndex) => {
        this.visualResponses.push(mapping.visualResponses[visualResponseIndex]);
      });
    }
  }
  
  get id() {
    return this.dataSource.id;
  }

  get root() {
    return this.component.root;
  }

  get labelTransform() {
    return this.component.labelTransform;
  }

  /**
    * @desc Reports if the button is touched, pressed, or in its default state.
    * @return enum - defined as ComponentState in constants.js
  */
  getComponentState() {
    let isPressed = false;
    let isTouched = false;

    // Checks if any of the associated GamepadButtons is touched or pressed
    Object.values(this.buttons).forEach((index) => {
      let button = this.gamepad.buttons[index];
      isPressed = isPressed | button.pressed;
      isTouched = isTouched | button.touched;
    });
    
    // Checks if axes are present and they have moved beyond defined thresholds
    // for touched and pressed
    Object.values(this.axes).forEach( (index) => {
      isTouched = isTouched | (Math.abs(this.gamepad.axes[index]) > Constants.TouchThreshold);
      
      // Only treat the component as PRESSED based on axes values if a physical 
      // button is not present
      if (!this.buttons.button) {
        isPressed = isPressed | (Math.abs(this.gamepad.axes[index]) > Constants.PressThreshold);
      }
    });

    // Pressed is a subset of touched, so check for that first
    if (isPressed) {
      return Constants.ComponentState.PRESSED;
    } else if (isTouched) {
      return Constants.ComponentState.TOUCHED;
    } else {
      return Constants.ComponentState.DEFAULT;
    }
  }

  /**
    * @desc gathers current data from the associated Gamepad
    * @param bool $axesAsButtons - indicates that x/y axis data should be 
    * returned as left/right/top/bottom buttons
    * @return object - the current data from the associated Gamepad
  */
  getData(axesAsButtons) {
    let data = {
      state: this.getComponentState(),
      buttons: {},
      axes: {}
    };

    // Adds entries for each GamepadButton associated with the component
    Object.keys(this.buttons).forEach((name) => {
      let index = this.buttons[name];
      data.buttons[name] = Object.assign({}, this.gamepad.buttons[index]);
    });

    // Adds entries for each axis associated with the component
    if (Object.keys(this.axes).length > 0) {

      // Either converts axis data to button pairs or reports axis data raw
      if (axesAsButtons) {

        // Helper function to generate button data pair
        const addButtonDataPair = (index, negativeKey, positiveKey) => {
          let value = this.gamepad.axes[index];

          // Adds a left or top button
          data.buttons[negativeKey] = {
            value: (value < 0) ? Math.abs(value) : 0,
            touched: (value < 0 && Math.abs(value) > Constants.TouchThreshold),
            pressed: (!this.buttons.button && value < 0 && Math.abs(value) > Constants.PressThreshold)
          };

          // Adds a right or bottom button
          data.buttons[positiveKey] = {
            value: (value > 0) ? value : 0,
            touched: (value > 0 && value > Constants.TouchThreshold),
            pressed: (!this.buttons.button && value > 0 && value > Constants.PressThreshold)
          };
        };

        // Adds button data to object being returned
        addButtonDataPair(this.axes.xAxis, "left", "right");
        addButtonDataPair(this.axes.yAxis, "top", "bottom");
      } else {
        // Adds axis data to object being returned
        Object.keys(this.axes).forEach((name) => {
          let index = this.axes[name];
          data.axes[name] = this.gamepad.axes[index];
        });
      }
    }

    return data;
  }

  /**
    * @desc builds an object representing how to weight asset nodes based on 
    * current gamepad state
    * @return object - an object with keys for each node to be modified. values
    * of each key are the nodes/weights pairing to modify based on
  */
  getWeightedVisualizations() {
    let weightedVisualResponses = {};

    const axesAsButtons = true;
    let data = this.getData(axesAsButtons);

    // Iterate all target nodes in the asset that are be impacted by a user
    // action and determine if the target has a response defined for the 
    // component's current state (press/touch).
    this.visualResponses.forEach((visualResponse) => {
      let visualResponseState = visualResponse[data.state];
      if (visualResponseState) {
        let weightedVisualResponse = {};
        
        // Iterate all nodes which will influence the target node and build
        // pairs of the node names and the weight each one should be given 
        // based on the component's data.
        Object.keys(visualResponseState).forEach((node) => {
          if (node != "degreesOfFreedom") {
            weightedVisualResponse[node] = { name: visualResponseState[node], weight: data.buttons[node].value };
          }
        });

        weightedVisualResponses[visualResponse.target] = weightedVisualResponse;
      }
    });
    return weightedVisualResponses;
  }
};

module.exports = XRGamepadComponent;
const Constants = require("./constants.js");

class XRGamepadComponent {
  constructor(componentIndex, mapping, gamepad) {
    if (componentIndex == undefined || mapping == undefined || gamepad == undefined) {
      throw new Error("Cannot create XRGamepadComponent from invalid parameters");
    }
    this.gamepad = gamepad;
    this.component = mapping.components[componentIndex];
    this.dataSource = mapping.dataSources[this.component.dataSource];
    this.visualResponses = [];
    this.buttons = {}
    this.axes = {};

    // Define helper functions
    let addAxis = (name, key) => {
      let index = this.dataSource[key];
      if (index >= this.gamepad.axes.length) {
        throw new Error("Gamepad '${this.xrGamepad.id}' has no ${name} at index ${index}");
      }
      this.axes[name] = index;
    };

    let addButton = (name, key) => {
      let index = this.dataSource[key];
      if (index >= this.gamepad.buttons.length) {
        throw new Error("Gamepad '${this.xrGamepad.id}' has no button ${name} at index ${index}");
      }
      this.buttons[name] = index;
    };

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
        // fallthrough
      case Constants.DataSourceType.BUTTON:
      default:
        if (this.dataSource.buttonIndex != undefined) {
          addButton("button", "buttonIndex");
        }
        break;
    }

    // Set up visual responses
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

  getComponentState() {
    let isPressed = false;
    let isTouched = false;

    // Checks if any of the associated GamepadButtons is touched or pressed
    Object.values(this.buttons).forEach((index) => {
      let button = this.gamepad.buttons[index];
      isPressed = isPressed | button.pressed;
      isTouched = isTouched | button.touched;
    });
    
    // If no button exists or is reporting pressed or touched, the component is
    // still considered touched if axes are present and they have moved outside
    // a known deadzone
    Object.values(this.axes).forEach( (index) => {
      isTouched = isTouched | (Math.abs(this.gamepad.axes[index]) > Constants.TouchThreshold);
      
      // If the axes-based component doesn't have an physical button, treat values over threshold as a press
      if (!this.buttons.button) {
        isPressed = isPressed | (Math.abs(this.gamepad.axes[index]) > Constants.PressThreshold);
      }
    });

    if (isPressed) {
      return Constants.ComponentState.PRESSED;
    } else if (isTouched) {
      return Constants.ComponentState.TOUCHED;
    } else {
      return Constants.ComponentState.DEFAULT;
    }
  }

  getData(axesAsButtons) {
    let data = {
      state: this.getComponentState(),
      buttons: {}
    };

    Object.keys(this.buttons).forEach((name) => {
      let index = this.buttons[name];
      data.buttons[name] = Object.assign({}, this.gamepad.buttons[index]);
    });

    if (Object.keys(this.axes).length > 0) {
      if (axesAsButtons) {
        const setButtonData = (index, negativeKey, positiveKey) => {
          let value = this.gamepad.axes[index];
          data.buttons[negativeKey] = {
            value: (value < 0) ? Math.abs(value) : 0,
            touched: (value < 0 && Math.abs(value) > Constants.TouchThreshold),
            pressed: (!this.buttons.button && value < 0 && Math.abs(value) > Constants.PressThreshold)
          };
          data.buttons[positiveKey] = {
            value: (value > 0) ? value : 0,
            touched: (value > 0 && value > Constants.TouchThreshold),
            pressed: (!this.buttons.button && value > 0 && value > Constants.PressThreshold)
          };
        };

        setButtonData(this.axes.xAxis, "left", "right");
        setButtonData(this.axes.yAxis, "top", "bottom");
      } else {
        data.axes = {};
        Object.keys(this.axes).forEach((name) => {
          let index = this.axes[name];
          data.axes[name] = this.gamepad.axes[index];
        });
      }
    }

    return data;
  }

  getWeightedVisualizations() {
    let weightedVisualResponses = {};

    const axesAsButtons = true;
    let data = this.getData(axesAsButtons);

    this.visualResponses.forEach((visualResponse) => {
      let visualResponseState = visualResponse[data.state];
      if (visualResponseState) {
        let weightedVisualResponse = {};
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
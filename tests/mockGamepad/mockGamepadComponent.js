const Constants = require("../../src/constants.js");

/**
 * @description Represents the component grouping of buttons and axes in a MockGamepad
 * @author Nell Waliczek / https://github.com/NellWaliczek
 */
class MockComponent {
  /**
   * @param {MockGamepad} mockGamepad - The MockGamepad this MockComponent will
   * be part of
   * @param {Object} mapping - The mapping object used to initialize the 
   * MockGamepad and containing the component description
   * @param {number} componentIndex - The index of the component in the mapping 
   * object that this MockComponent will represent
   */
  constructor(mockGamepad, mapping, componentIndex) {
    if (!mockGamepad || !mapping) {
      throw new Error("Cannot create MockComponent from invalid parameters");
    }

    if (componentIndex < 0 || componentIndex >= mapping.components.length) {
      throw new Error(`Component index ${componentIndex} is outside array boundaries`);
    }

    this.mockGamepad = mockGamepad;
    let component = mapping.components[componentIndex];
    this.dataSource = mapping.dataSources[component.dataSource];
    this.buttons = {};

    // Add axes and buttons to the MockGamepad needed by this mock component
    switch (this.dataSource.dataSourceType) {
      case Constants.DataSourceType.BUTTON:
        this.buttons["button"] = this.mockGamepad.addGamepadButton(this.dataSource.buttonIndex);   
        break;

      case Constants.DataSourceType.DPAD_FROM_AXES:
      case Constants.DataSourceType.THUMBSTICK:
      case Constants.DataSourceType.TOUCHPAD:
        this.hasAxes = true;
        this.mockGamepad.addGamepadAxis(this.dataSource.xAxisIndex);
        this.mockGamepad.addGamepadAxis(this.dataSource.yAxisIndex);
        if (this.dataSource.buttonIndex != undefined) {
          this.buttons["button"] = this.mockGamepad.addGamepadButton(this.dataSource.buttonIndex);   
        }
        break;

      case Constants.DataSourceType.DPAD_FROM_BUTTONS:
        this.buttons["left"] = this.mockGamepad.addGamepadButton(this.dataSource.leftButtonIndex);
        this.buttons["right"] = this.mockGamepad.addGamepadButton(this.dataSource.rightButtonIndex);
        this.buttons["bottom"] = this.mockGamepad.addGamepadButton(this.dataSource.bottomButtonIndex);
        this.buttons["top"] = this.mockGamepad.addGamepadButton(this.dataSource.topButtonIndex);
        break;
    }
  }

  get id() {
    return this.dataSource.id;
  }

  /**
   * @description Sets requested values for the component on the MockGamepad
   * @param {Object} values - The values dictionary contains a buttons 
   * dictionary and an axes dictionary
   * @param {Object} values.buttons - The collection of key/value pairs of 
   * button names and button values to set on those buttons
   * @param {Object} values.axes - The collection of key/value pairs of axis 
   * names and axis values to set on those axes
   */
  setValues({buttons={}, axes={}}={}) {
    Object.keys(buttons).forEach((key) => {
      switch(key) {
        case "button":
        case "left":
        case "right":
        case "top":
        case "bottom":
          if (!this.buttons[key]) {
            throw new Error(`Button '${key}' does not exist on this component`);
          }
          this.buttons[key].setValues(buttons[key]);
          break;

        default:
          throw new Error(`Unknown value ${key} cannot be set on this component`);
      }
    });

    Object.keys(axes).forEach((key) => {
      if (!this.hasAxes) {
        throw new Error("Axis `" + key + "` does not exist on this component");
      }

      switch(key) {
        case "xAxis":
        case "yAxis":
          let axisIndex = this.dataSource[key + "Index"];
          this.mockGamepad.axes[axisIndex] = axes[key];
          break;

        default:
          throw new Error("Unknown axis `" + key + "` cannot be set on this component");
      }
    });
  }

  /**
   * @description Gets the component's values from the associated gamepad
   * @returns {Object} - Contains buttons and axes properties filled with 
   * key/value pairs representing button or axis names and their values 
   * respectively
   */
  getValues() {
    let values = { buttons: {}, axes: {}};
    Object.keys(this.buttons).forEach((key) => {
      values.buttons[key] = this.buttons[key].getValues();
    });

    if (this.hasAxes) {
      values.axes["xAxis"] = this.mockGamepad.axes[this.dataSource.xAxisIndex];
      values.axes["yAxis"] = this.mockGamepad.axes[this.dataSource.yAxisIndex];
    }

    return values;
  }
};

module.exports = MockComponent;
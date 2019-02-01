class DataSourceMapping {
  constructor(mappingDescription, dataSourceIndex, gamepad) {
    this.description = mappingDescription.gamepad.dataSources[dataSourceIndex];
    this.gamepad = gamepad;
    this.properties = {};
    switch(this.dataSourceType) {
      case "buttonSource":
        this.properties["button"] = this.buildButtonProperties(this.description.button);
        break;
      case "dpadSource":
        this.properties["left"] = this.buildButtonProperties(this.description.left);
        this.properties["right"] = this.buildButtonProperties(this.description.right);
        this.properties["down"] = this.buildButtonProperties(this.description.down);
        this.properties["up"] = this.buildButtonProperties(this.description.up);
        break;
      case "thumbstickSource":
      case "touchpadSource":
        this.properties["xAxis"] = this.buildAxisProperties(this.description.xAxis);
        this.properties["yAxis"] = this.buildAxisProperties(this.description.yAxis);
        if (this.description.button) {
          this.properties["button"] = this.buildButtonProperties(this.description.button);
        }
        break;
      default:
        throw new Error("Unknown dataSourceType: " + this.dataSourceType);
    } 
  }

  get id() {
    return this.description.id;
  }

  get dataSourceType() {
    return this.description.dataSourceType;
  }

  buildButtonProperties(source) {
    let buttonProperties = { "type": "button" };
    ({
      gamepadButtonsIndex: buttonProperties.gamepadIndex,
      supportsTouch: buttonProperties.supportsTouch = true,
      supportsPressed: buttonProperties.supportsPress = true ,
      analogValues: buttonProperties.supportsAnalogValues = false,
      min: buttonProperties.min = 0.0,
      max: buttonProperties.max = 1.0
    } = source);
    return buttonProperties;
  }

  buildAxisProperties(source) {
    let axisProperties = { "type": "axis", "supportsAnalogValues": true };
    ({
      gamepadAxesIndex: axisProperties.gamepadIndex,
      min: axisProperties.min = -0.5,
      max: axisProperties.max = 0.5,
    } = source);
    return axisProperties;
  }

  getValues() {
    let values = {};
    Object.keys(this.properties).forEach((key) => {
      let property = this.properties[key];
      if (property.type == "button") {
        let gamepadButton = this.gamepad.buttons[property.gamepadIndex];
        values[key] = {
          value: gamepadButton.value,
          touched: gamepadButton.touched,
          pressed: gamepadButton.pressed
        };
      } else if (property.type == "axis") {
        values[key] = { value: this.gamepad.axes[property.gamepadIndex] };
      }
    });
    return values;
  }

  validateValues(values) {
    let errors = {};
    Object.keys(values).forEach((key) => {
      let error;
      let value = values[key];
      let property = this.properties[key];

      if (!property) {
        error = "No dataSourceProperty present";
      } else if (value < property.min) {
        error = "Value " + value + " is less than minimum " + property.min;
      } else if (value > property.max) {
        error = "Value " + value + " is greater than maximum " + property.max;
      } else if (!property.supportsAnalogValues && !(value == property.min || value == property.max)) {
        error = "Analog value " + value + " is not allowed.  Must be between " + property.min + " and " + property.max;
      }

      if (error) {
        errors[key] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      return errors;
    }
  }
};

module.exports = DataSourceMapping;
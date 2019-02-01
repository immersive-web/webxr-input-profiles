class MockComponent {
  constructor(componentMapping, mockGamepad) {
    this.componentMapping = componentMapping;
    this.mockGamepad = mockGamepad;
    this.dataSourceMapping = this.componentMapping.dataSourceMapping;
    this.dataSourceProperties = this.dataSourceMapping.properties;

    Object.keys(this.dataSourceProperties).forEach((key) => {
      if (key == "button" || key == "left" || key == "right" || key == "down" || key == "up") {
        this.mockGamepad.addGamepadButton(this.dataSourceProperties[key].gamepadIndex);
      }

      if (key == "xAxis" || key == "yAxis") {
        this.mockGamepad.addGamepadAxis(this.dataSourceProperties[key].gamepadIndex)
      }
    });
  }

  get id() {
    return this.componentMapping.id;
  }

  setValues(values) {
    let errors = this.dataSourceMapping.validateValues(values);
    if (errors) {
      throw new Error(JSON.stringify(errors));
    }
  
    const pressThreshold = 0.7;
    const axisDefault = 0;
    let axisTouched = false;

    Object.keys(values).forEach((key) => {
      let properties = this.dataSourceProperties[key];
      let value = values[key];
      if (properties.type == "button") {
        let gamepadButton = this.mockGamepad.buttons[properties.gamepadIndex];
        gamepadButton.value = value;
        gamepadButton.touched = (properties.supportsTouch && (value > properties.min));
        gamepadButton.pressed = (properties.supportsPress && (value > (properties.max * pressThreshold)));
      }

      if (properties.type == "axis") {
        this.mockGamepad.axes[properties.gamepadIndex] = value;
        axisTouched |= (value != axisDefault);
      }
    });

    // Ensure that the thumbstick/touchpad button's touched value is correct
    let button = this.dataSourceProperties["button"];
    if (axisTouched && button && button.supportsTouch) {
      this.mockGamepad.buttons[button.gamepadIndex].touched = true;
    }
  }

  getValues() {
    let values = {};
    Object.keys(this.dataSourceProperties).forEach((key) => {
      let properties = this.dataSourceProperties[key];
      values[key] = {};
      if (properties.type == "button") {
        let gamepadButton = this.mockGamepad.buttons[properties.gamepadIndex];
        values[key].value = gamepadButton.value;
        values[key].touched = gamepadButton.touched;
        values[key].pressed = gamepadButton.pressed;
      } else if (properties.type == "axis") {
        values[key].value = this.mockGamepad.axes[properties.gamepadIndex];
      }
    });
    return values;
  }
};

module.exports = MockComponent;
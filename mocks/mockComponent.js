class MockComponent {
  constructor(componentMapping, mockGamepad) {
    this.componentMapping = componentMapping;
    this.mockGamepad = mockGamepad;
    this.dataSourceMapping = this.componentMapping.dataSourceMapping;
    
    let dataSourceProperties = this.dataSourceMapping.properties;

    Object.keys(dataSourceProperties).forEach((key) => {
      let property = dataSourceProperties[key];
      if (property.type == "button") {
        this.mockGamepad.addGamepadButton(dataSourceProperties[key].gamepadIndex);
      }

      if (property.type == "axis") {
        this.mockGamepad.addGamepadAxis(dataSourceProperties[key].gamepadIndex)
      }
    });
  }

  get id() {
    return this.componentMapping.id;
  }

  setValues(componentValues) {
    Object.keys(componentValues).forEach((key) => {
      let property = this.dataSourceMapping.properties[key];
      if (!property) {
        throw new Error("Property " + key + " does not exist");
      }
      let propertyValues = componentValues[key];

      if (property.type == "button") {
        let gamepadButton = this.mockGamepad.buttons[property.gamepadIndex];
        ({
          value: gamepadButton.value = gamepadButton.value,
          touched: gamepadButton.touched = gamepadButton.touched,
          pressed: gamepadButton.pressed = gamepadButton.pressed,
        } = propertyValues);
      }

      if (property.type == "axis") {
        this.mockGamepad.axes[property.gamepadIndex] = propertyValues.value;
      }
    });
  }

  getValues() {
    let componentValues = {};
    let dataSourceProperties = this.dataSourceMapping.properties;
    Object.keys(dataSourceProperties).forEach((key) => {
      let property = dataSourceProperties[key];
      if (property.type == "button") {
        let gamepadButton = this.mockGamepad.buttons[property.gamepadIndex];
        componentValues[key] = { 
          value: gamepadButton.value,
          touched: gamepadButton.touched,
          pressed: gamepadButton.pressed
        };
      } else if (property.type == "axis") {
        componentValues[key] = { 
          value: this.mockGamepad.axes[property.gamepadIndex]
        };
      }
    });
    return componentValues;
  }
};

module.exports = MockComponent;
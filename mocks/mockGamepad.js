var MockComponent = require("./mockComponent.js");

class MockGamepadButton {
  constructor() {
    this.reset();
  }

  reset() {
    this.pressed = false;
    this.touched = false;
    this.value = 0;
  }
};

class MockGamepad {
  constructor(id) {
    this.id = id;
    this.index = -1;
    this.connected = true;
    this.timestamp = 0;
    this.mapping = "xr-standard";
    this.axes = [];
    this.buttons = [];
    this.mockComponents = {};
  }

  initialize(gamepadMapping) {
    if (this.id != gamepadMapping.id) {
      throw new Error("mock gamepad created with mismatched mapping. Expected '" + this.id + "' and got '" + gamepadMapping.id + "'");
    }

    Object.keys(gamepadMapping.componentMappings).forEach((key) => {
      let componentMapping = gamepadMapping.componentMappings[key];
      let mockComponent = new MockComponent(componentMapping, this);
      this.mockComponents[mockComponent.id] = mockComponent;
    });
  }

  addGamepadButton(buttonIndex) {
    while (this.buttons.length < buttonIndex) {
      this.buttons.push(null);
    }

    let button = new MockGamepadButton();
    this.buttons.push(button);
  }

  addGamepadAxis(axisIndex) {
    while (this.axes.length < axisIndex) {
      this.axes.push(null);
    }

    this.axes.push(0);
  }

  reset() {
    this.buttons.forEach((button) => {
      button.reset();
    })

    this.axes.fill(0);
  }
};

module.exports = MockGamepad;
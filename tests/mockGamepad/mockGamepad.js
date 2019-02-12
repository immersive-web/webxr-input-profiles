const TestHelpers = require("../testHelpers.js");
const MockComponent = require("./mockComponent.js");

class MockGamepadButton {
  constructor() {
    this.reset();
  }

  reset() {
    this.pressed = false;
    this.touched = false;
    this.value = 0;
  }

  setValues(values) {
    this.pressed = values.pressed || this.pressed;
    this.touched = values.touched || this.touched;
    this.value = (values.value == undefined) ? this.value : values.value;
  }

  getValues() {
    return {
      pressed: this.pressed,
      touched: this.touched,
      value: this.value
    };
  }
};

class MockGamepad {
  constructor(mapping, handedness) {
    this.hand = mapping.hands[handedness];

    this.id = mapping.id;
    this.index = -1;
    this.connected = true;
    this.timestamp = 0;
    this.mapping = "xr-standard";
    this.axes = [];
    this.buttons = [];
    this.mockComponents = {};

    this.hand.components.forEach( (componentIndex) => {
      let mockComponent = new MockComponent(componentIndex, mapping, this);
      this.mockComponents[mockComponent.id] = mockComponent;
    });
  }

  addGamepadButton(buttonIndex) {
    let button = new MockGamepadButton();
    this.buttons[buttonIndex] = button;
    return button;
  }

  addGamepadAxis(axisIndex) {
    while (this.axes.length <= axisIndex) {
      this.axes.push(0);
    }
  }

  reset() {
    this.buttons.forEach((button) => {
      button.reset();
    })

    this.axes.fill(0);
  }

  getValues(componentId) {
    if (this.mockComponents[componentId]) {
      return this.mockComponents[componentId].getValues();
    } else {
      throw new Error("No componentId `" + componentId + "` in mock gamepad");
    }
  }
};

module.exports = MockGamepad;
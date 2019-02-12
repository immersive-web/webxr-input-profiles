const MockGamepadComponent = require("./mockGamepadComponent.js");
const MockGamepadButton = require("./mockGamepadButton.js");

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
      let mockComponent = new MockGamepadComponent(componentIndex, mapping, this);
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
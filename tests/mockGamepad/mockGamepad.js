const MockGamepadComponent = require("./mockGamepadComponent.js");
const MockGamepadButton = require("./mockGamepadButton.js");
const Constants = require("../../src/constants.js");

/**
 * @description A mock implementation of the Gamepad object as defined 
 * by https://www.w3.org/TR/gamepad/
 * @author Nell Waliczek / https://github.com/NellWaliczek
 */
class MockGamepad {

  /**
   * @param {Object} mapping - The mapping file text in dictionary form
   * @param {String} handedness - An enum value as defined by Handedness in 
   * constants.js
   */
  constructor(mapping, handedness) {
    if (!Object.values(Constants.Handedness).includes(handedness)) {
      throw new Error(`Cannot create XRGamepad for unknown handedness ${handedness}`);
    }

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
      let mockComponent = new MockGamepadComponent(this, mapping, componentIndex);
      this.mockComponents[mockComponent.id] = mockComponent;
    });
  }

  /**
   * @description extends the MockGamepad.buttons array to have an 
   * MockGamepadButton at the requested buttonIndex
   * @param {number} buttonIndex - The index at which to add the new 
   * MockGamepadButton
   */
  addGamepadButton(buttonIndex) {
    if (buttonIndex < 0) {
      throw new Error(`Cannot add button at index ${buttonIndex}`);
    }
    let button = new MockGamepadButton();
    this.buttons[buttonIndex] = button;
    return button;
  }

  /**
   * @description extends the MockGamepad.axes array to have a value at the 
   * requested axisIndex
   * @param {number} axisIndex - The index at which to add the new value
   */
  addGamepadAxis(axisIndex) {
    if (axisIndex < 0) {
      throw new Error(`Cannot add axis at index ${axisIndex}`);
    }
    this.axes[axisIndex] = 0;
  }

  /**
   * @description resets all values to the initial state
   */
  reset() {
    this.buttons.forEach((button) => {
      button.reset();
    })

    this.axes.fill(0);
  }

  /**
   * Gets the values associated with the provided MockComponent
   * @param {String} componentId - The ID of the component whose values are 
   * being queried
   * @returns {Object} The values of buttons and axes associated with the 
   * componentId
   */
  getValues(componentId) {
    if (this.mockComponents[componentId]) {
      return this.mockComponents[componentId].getValues();
    } else {
      throw new Error("No componentId `" + componentId + "` in mock gamepad");
    }
  }
};

module.exports = MockGamepad;
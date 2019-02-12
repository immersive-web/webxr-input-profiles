const XRGamepadComponent = require("./xrGamepadComponent.js");

class XRGamepad {
  constructor(gamepad, handedness, mapping) {
    this.gamepad = gamepad;
    this.handedness = (handedness) ? handedness : "neutral";

    // @TODO set this up to use the jest mocking system for testing
    this.mapping = mapping;
    this.hand = this.mapping.hands[handedness];
    if (!this.hand) {
      throw new Error("No ${this.handedness} hand exists for ${this.gamepad.id}");
    }
    
    this.xrGamepadComponents = {};
    this.hand.components.forEach((componentIndex) => {
      let component = new XRGamepadComponent(componentIndex, mapping, this.gamepad);
      this.xrGamepadComponents[component.id] = component;

      if (this.hand.primaryButtonComponent == componentIndex) {
        this.primaryButtonComponent = component;
      }

      if (this.hand.primaryAxisComponent == componentIndex) {
        this.primaryAxisComponent = component;
      }
    });
  }

  get id() {
    return this.gamepad.id;
  }

  get asset() {
    return this.hand.asset;
  }

  get root() {
    return this.hand.root;
  }
};

module.exports = XRGamepad;
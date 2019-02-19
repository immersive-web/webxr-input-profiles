const Constants = require("./constants.js");
const XRGamepadComponent = require("./xrGamepadComponent.js");

/**
  * @description This class connects an XR gamepad, as described in a mapping.json file,
  * with a Gamepad object, as defined by https://www.w3.org/TR/gamepad/
  * @author Nell Waliczek / https://github.com/NellWaliczek
*/
class XRGamepad {

  /**
   * @param {Gamepad} gamepad - The Gamepad object provided by the user agent
   * @param {dictionary} mapping - The mapping file text in dictionary form
   * @param {string} handedness - "neutral", "left", or "right"
   */
  constructor(gamepad, mapping, handedness) {
    if (!gamepad || !mapping) {
      throw new Error("Cannot create XRGamepad from invalid parameters");
    }

    if (gamepad.id != mapping.id) {
      throw new Error(`Gamepad id ${gamepad.id} and mapping id ${mapping.id} do not match`);
    }

    this.gamepad = gamepad;
    this.mapping = mapping;

    if (this.gamepad.handedness && this.gamepad.handedness != handedness) {
      throw new Error(`Gamepad.handedness ${this.gamepad.handedness} does not match handedness parameter ${handedness}`);
    }

    this.handedness = (!handedness || handedness === "") ? Constants.Handedness.NEUTRAL : handedness;
    if (!Object.values(Constants.Handedness).includes(this.handedness)) {
      throw new Error(`Cannot create XRGamepad for unknown handedness ${this.handedness}`);
    }

    this.hand = this.mapping.hands[this.handedness];
    if (!this.hand) {
      throw new Error(`No ${this.handedness} hand exists in mapping for ${this.gamepad.id}`);
    }
    
    // Create component objects for each component described in the gamepad's mapping file
    this.xrGamepadComponents = {};
    this.hand.components.forEach((componentIndex) => {
      let component = new XRGamepadComponent(this.gamepad, mapping, componentIndex);
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
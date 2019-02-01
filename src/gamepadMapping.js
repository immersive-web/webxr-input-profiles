let MappingDescriptions = require("../src/mappingDescriptions.js");
var ComponentMapping = require("./componentMapping.js");

class GamepadMapping {
  constructor(gamepad, handedness) {
    this.gamepad = gamepad;
    this.mappingDescription = MappingDescriptions.getMappingById(gamepad.id);
    this.gamepadDescription = this.mappingDescription.gamepad;

    this.handedness = (handedness) ? handedness : "neutral";
    this.handDescription = this.gamepadDescription.hands[handedness];
    if (!this.handDescription) {
      throw "No " + this.handedness + " hand exists for " + this.gamepadDescription.id;
    }
    
    this.componentMappings = {};
    
    for (let i = 0; i < this.handDescription.components.length; i++) {
      let componentIndex = this.handDescription.components[i];
      let componentMapping = new ComponentMapping(this.mappingDescription, componentIndex, this.gamepad);
      this.componentMappings[componentMapping.id] = componentMapping;

      if (this.handDescription.primaryButton == componentIndex) {
        this.primaryButton = componentMapping.id;
      }

      if (this.handDescription.primaryAxes == componentIndex) {
        this.primaryAxes = componentMapping.id;
      }
    }
  }

  getComponentsList() {
    return Object.keys(this.componentMappings);
  }

  getValues(componentId) {
    if (!this.componentMappings[componentId]) {
      throw new Error("Requested component '" + componentId + "' does not exist");
    }
    
    return this.componentMappings[componentId].dataSourceMapping.getValues();
  }

  updateVisuals() {
    Object.keys(this.componentMappings).forEach( (key) => {
      this.componentMappings[key].updateVisuals();
    });
  }

  get id() {
    return this.gamepadDescription.id;
  }

  get asset() {
    return this.handDescription.asset;
  }

  get root() {
    return this.handDescription.root;
  }
};

module.exports = GamepadMapping;
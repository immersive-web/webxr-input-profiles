var DataSourceMapping = require("./dataSourceMapping.js");
var ResponseMapping = require("./responseMapping.js");

class ComponentMapping {
  constructor(mappingDescription, componentIndex, gamepad) {
    this.componentDescription = mappingDescription.gamepad.components[componentIndex];
    this.gamepad = gamepad;
    this.dataSourceMapping = new DataSourceMapping(mappingDescription, this.componentDescription.dataSource, this.gamepad);

    if (this.componentDescription.pressResponse) {
      this.pressResponseMapping = new ResponseMapping(mappingDescription, this.componentDescription.pressResponse);
    }

    if (this.componentDescription.touchResponse) {
      this.touchResponseMapping = new ResponseMapping(mappingDescription, this.componentDescription.pressResponse);
    }
  }

  get id() {
    return this.dataSourceMapping.id;
  }

  get dataSourceType() {
    return this.dataSourceMapping.dataSourceType;
  }

  get root() {
    return this.componentDescription.root;
  }

  get labelTransform() {
    return this.componentDescription.labelTransform;
  }

  updateVisuals() {
    let datSourceValues = this.dataSourceMapping.getValues();
    if (this.pressResponseMapping) {
      this.pressResponseMapping.apply(datSourceValues);
    }

    if (this.pressResponseMapping) {
      this.pressResponseMapping.apply(datSourceValues);
    }
  }

};

module.exports = ComponentMapping;
class DataSourceMapping {
  constructor(mappingDescription, dataSourceIndex, gamepad) {
    this.description = mappingDescription.gamepad.dataSources[dataSourceIndex];
    this.gamepad = gamepad;

    this.properties = {};
    Object.keys(this.description).forEach((key) => {
      let propertyName = key.substring(0, key.lastIndexOf("Index"));
      switch(key) {
        case "leftButtonIndex":
        case "rightButtonIndex":
        case "downButtonIndex":
        case "upButtonIndex":
        case "buttonIndex":
          this.properties[propertyName] = {
            type: "button",
            gamepadIndex: this.description[key],
            touchSupportedAtMinValue: this.description.touchSupportedAtMinValue,
            pressUnsupported: this.description.pressUnsupported,
            analogValues: this.description.analogValues,
            default: 0,
            min: 0, 
            max: 1 
          };
          break;
        case "xAxisIndex":
        case "yAxisIndex":
          this.properties[propertyName] = { 
            type: "axis",
            gamepadIndex: this.description[key],
            analogButtonValues: this.description.analogButtonValues,
            default: 0,
            min: -1, 
            max: 1 };
          break;
      }
    });
  }

  get id() {
    return this.description.id;
  }

  get dataSourceType() {
    return this.description.dataSourceType;
  }

  getValues() {
    let values = {};
    Object.keys(this.properties).forEach((key) => {
      let property = this.properties[key];
      if (property.type == "button") {
        let gamepadButton = this.gamepad.buttons[property.gamepadIndex];
        values[key] = {
          value: gamepadButton.value,
          touched: gamepadButton.touched,
          pressed: gamepadButton.pressed
        };
      } else if (property.type == "axis") {
        values[key] = { value: this.gamepad.axes[property.gamepadIndex] };
      }
    });
    return values;
  }
}

module.exports = DataSourceMapping;
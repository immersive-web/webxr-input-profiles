class MockComponent {
  constructor(componentIndex, mapping, mockGamepad) {
    this.mockGamepad = mockGamepad;
    let component = mapping.components[componentIndex];
    this.dataSource = mapping.dataSources[component.dataSource];

    this.hasAxes = (this.dataSource.dataSourceType == "dpadFromAxesSource" ||
                    this.dataSource.dataSourceType == "thumbstickSource" ||
                    this.dataSource.dataSourceType == "touchpadSource");

    if (this.hasAxes) {
      this.mockGamepad.addGamepadAxis(this.dataSource.xAxisIndex);
      this.mockGamepad.addGamepadAxis(this.dataSource.yAxisIndex);
    }

    this.buttons = {};
    if (this.dataSource.buttonIndex != undefined) {
      this.buttons["button"] = this.mockGamepad.addGamepadButton(this.dataSource.buttonIndex);   
    } else if (this.dataSource.dataSourceType == "dpadFromButtonsSource") {
      this.buttons["left"] = this.mockGamepad.addGamepadButton(this.dataSource.leftButtonIndex);
      this.buttons["right"] = this.mockGamepad.addGamepadButton(this.dataSource.rightButtonIndex);
      this.buttons["bottom"] = this.mockGamepad.addGamepadButton(this.dataSource.bottomButtonIndex);
      this.buttons["top"] = this.mockGamepad.addGamepadButton(this.dataSource.topButtonIndex);
    }
  }

  get id() {
    return this.dataSource.id;
  }

  setValues({buttons={}, axes={}}={}) {
    Object.keys(buttons).forEach((key) => {
      switch(key) {
        case "button":
        case "left":
        case "right":
        case "top":
        case "bottom":
          if (!this.buttons[key]) {
            throw new Error(`Button '${key}' does not exist on this component`);
          }
          this.buttons[key].setValues(buttons[key]);
          break;

        default:
          throw new Error(`Unknown value ${key} cannot be set on this component`);
      }
    });

    Object.keys(axes).forEach((key) => {
      switch(key) {
        case "xAxis":
        case "yAxis":
          if (!this.hasAxes) {
            throw new Error("Axis `" + key + "` does not exist on this component");
          }
          let axisIndex = this.dataSource[key + "Index"];
          this.mockGamepad.axes[axisIndex] = axes[key];
          break;

        default:
          throw new Error("Unknown value `" + key + "` cannot be set on this component");
      }
    });
  }

  getValues() {
    let values = { buttons: {}, axes: {}};
    Object.keys(this.buttons).forEach((key) => {
      values.buttons[key] = this.buttons[key].getValues();
    });

    if (this.hasAxes) {
      values.axes["xAxis"] = this.mockGamepad.axes[this.dataSource.xAxisIndex];
      values.axes["yAxis"] = this.mockGamepad.axes[this.dataSource.yAxisIndex];
    }

    return values;
  }
};

module.exports = MockComponent;
class MockComponent {
  constructor(componentIndex, mockGamepad) {
    this.mockGamepad = mockGamepad;
    let component = this.mockGamepad.mapping.components[componentIndex];
    this.dataSource = this.mockGamepad.mapping.dataSources[component.dataSource];

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

  setValues(values) {
    Object.keys(values).forEach((key) => {
      switch(key) {
        case "button":
        case "left":
        case "right":
        case "top":
        case "bottom":
          if (!this.buttons[key]) {
            throw new Error("Button `" + key + "` does not exist on this component");
          }
          this.buttons[key].setValues(values[key]);
          break;

        case "xAxis":
        case "yAxis":
          if (!this.hasAxes) {
            throw new Error("Axis `" + key + "` does not exist on this component");
          }
          let axisIndex = this.dataSource[key + "Index"];
          this.mockGamepad.axes[axisIndex] = values[key];
          break;

        default:
          throw new Error("Unknown value `" + key + "` cannot be set on this component");
      }
    });
  }

  getValues() {
    let values = {};
    Object.keys(this.buttons).forEach((key) => {
      values[key] = this.buttons[key].getValues();
    });

    if (this.hasAxes) {
      values["xAxis"] = this.mockGamepad.axes[this.dataSource.xAxisIndex];
      values["yAxis"] = this.mockGamepad.axes[this.dataSource.yAxisIndex];
    }

    return values;
  }
};

module.exports = MockComponent;
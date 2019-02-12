var XRVisualResponse = require("./xrVisualResponse.js");

class XRGamepadComponent {
  constructor(componentIndex, xrGamepad) {
    this.xrGamepad = xrGamepad;
    this.component = this.xrGamepad.mapping.gamepad.components[componentIndex];
    this.dataSource = this.xrGamepad.mapping.gamepad.dataSources[this.component.dataSource];
    this.visualResponses = {};

    let validateAxisIndex = (index) => {
      if (index >= this.xrGamepad.axes.length) {
        throw new Error("Gamepad '" + this.xrGamepad.id + "' has no axis at index " + index);
      }
    };

    let validateButtonIndex = (index) => {
      if (index >= this.xrGamepad.buttons.length) {
        throw new Error("Gamepad '" + this.xrGamepad.id + "' has no button at index " + index);
      }
    };

    // Determine if the data source is one that uses axes
    this.hasAxes = (this.dataSource.dataSourceType == "dpadFromAxesSource" ||
                    this.dataSource.dataSourceType == "thumbstickSource" ||
                    this.dataSource.dataSourceType == "touchpadSource");

    // Validate necessary axes exist on Gamepad
    if (this.hasAxes) {
      validateAxisIndex(this.dataSource.xAxisIndex);
      validateAxisIndex(this.dataSource.yAxisIndex);
    }

    // Validate necessary buttons exist on Gamepad
    if (this.dataSource.buttonIndex != undefined) {
      validateButtonIndex(this.dataSource.buttonIndex);
    } else if (this.dataSource.dataSourceType == "dpadFromButtonsSource") {
      validateButtonIndex(this.dataSource.leftButtonIndex);
      validateButtonIndex(this.dataSource.rightButtonIndex);
      validateButtonIndex(this.dataSource.topButtonIndex);
      validateButtonIndex(this.dataSource.bottomButtonIndex);
    }

    // Set up visual responses
    if (this.component.visualResponses) {
      this.component.visualResponses.forEach((visualResponseIndex) => {
        this.visualResponses.push(new XRVisualResponse(visualResponseIndex, this.xrGamepad));
      });
    }
  }

  get id() {
    return this.dataSource.id;
  }

  get root() {
    return this.component.root;
  }

  get labelTransform() {
    return this.component.labelTransform;
  }

  getAxesData() {
    let axesData = {};
    if (this.hasAxes) {
      axesData.xAxis = this.xrGamepad.axes[this.dataSource.xAxisIndex];
      axesData.yAxis = this.xrGamepad.axes[this.dataSource.yAxisIndex];
    }
    // @TODO this would be where we normalize or invert the values if the override specifies it
    return axesData;
  }

  getButtonsData() {
    let buttonsData = {};

    let extractButtonData = function (key) {
      let index = this.dataSource[key + "Index"];
      ({value, touched, pressed} = this.xrGamepad.buttons[index]);
      // @TODO this would be where we normalize the values if the override specifies it
      buttonsData[key] = {value, touched, pressed};
    };

    if (this.dataSource.buttonIndex != undefined) {
      extractButtonData("button");
    } else if (this.dataSource.dataSourceType == "dpadFromButtonsSource") {
      extractButtonData("left");
      extractButtonData("right");
      extractButtonData("top");
      extractButtonData("bottom");

      if (buttonsData.left.value > 0 && buttonsData.right.value > 0) {
        console.warn("Gamepad '" + this.xrGamepad.id + "' with dpad '" + this.dataSource.id + "' is reporting left and right values > 0");
      }

      if (buttonsData.top.value > 0 && buttonsData.bottom.value > 0) {
        console.warn("Gamepad '" + this.xrGamepad.id + "' with dpad '" + this.dataSource.id + "' is reporting top and bottom values > 0");
      }
    }
    // @TODO this would be where we normalize the values if the override specifies it
    return buttonsData;
  }
};

module.exports = XRGamepadComponent;
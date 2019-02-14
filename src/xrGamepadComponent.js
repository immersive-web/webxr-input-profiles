var XRGamepadVisualResponse = require("./xrGamepadVisualResponse.js");

class XRGamepadComponent {
  constructor(componentIndex, mapping, xrGamepad) {
    this.xrGamepad = xrGamepad;
    this.component = mapping.components[componentIndex];
    this.dataSource = mapping.dataSources[this.component.dataSource];
    this.xrGamepadVisualResponses = {};

    // Define validation helper functions
    let validateAxisIndex = (index) => {
      if (index >= this.xrGamepad.gamepad.axes.length) {
        throw new Error("Gamepad '${this.xrGamepad.id}' has no axis at index ${index}");
      }
    };

    let validateButtonIndex = (index) => {
      if (index >= this.xrGamepad.gamepad.buttons.length) {
        throw new Error("Gamepad '${this.xrGamepad.id}' has no button at index ${index}");
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
        let visualResponse = mapping.visualResponses[visualResponseIndex];
        let xrGamepadVisualResponse = new XRGamepadVisualResponse(visualResponse, this);
        this.xrGamepadVisualResponses[xrGamepadVisualResponse.target] = xrGamepadVisualResponse;
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

  isTouched() {
    let buttonsData = this.getButtonsData();
    let axesData = this.getAxesData();
    let isTouched = false;

    // Checks if any of the associated GamepadButtons is touched.
    // Also, to be on the safe side, check for pressed because a button isn't 
    // supposed to be pressed without being touched per the Gamepad spec
    Object.values(buttonsData).forEach( (buttonData) => {
      if (buttonData.touched || buttonData.pressed) {
        isTouched = true;
      }
    })
    
    // If no button exists or is reporting touched, the component is still
    // considered touched if axes are present and they have moved outside
    // a known deadzone
    if (!isTouched) {
      const touchDeadzoneThreshold = 0.1;
      Object.values(axesData).forEach( (axisData) => {
        if (Math.abs(axisData) > touchDeadzoneThreshold) {
          isTouched = true;
        }
      });
    }

    return isTouched;
  }

  isPressed() {
    let buttonsData = this.getButtonsData();
    let isPressed = false;

    // Checks if any of the associated GamepadButtons is pressed
    Object.values(buttonsData).forEach((buttonData) => {
      if (buttonData.pressed) {
        isPressed = true;
      }
    })
    
    return isPressed;
  }

  getAxesData() {
    let axesData = {};
    if (this.hasAxes) {
      axesData.xAxis = this.xrGamepad.gamepad.axes[this.dataSource.xAxisIndex];
      axesData.yAxis = this.xrGamepad.gamepad.axes[this.dataSource.yAxisIndex];
    }
    // @TODO this would be where we normalize or invert the values if the override specifies it
    return axesData;
  }

  getButtonsData() {
    // Define helper function for destructuring assignment
    let extractButtonData = ({value, touched, pressed}) => ({value, touched, pressed});

    // Copy button data 
    let buttonsData = {};
    let buttons = this.xrGamepad.gamepad.buttons;

    if (this.dataSource.buttonIndex != undefined) {
      buttonsData.button = extractButtonData(buttons[this.dataSource.buttonIndex]);
    } else if (this.dataSource.dataSourceType == "dpadFromButtonsSource") {
      buttonsData.left = extractButtonData(buttons[this.dataSource.leftButtonIndex]);
      buttonsData.right = extractButtonData(buttons[this.dataSource.rightButtonIndex]);
      buttonsData.top = extractButtonData(buttons[this.dataSource.topButtonIndex]);
      buttonsData.bottom = extractButtonData(buttons[this.dataSource.bottomButtonIndex]);

      // Warn about unexpected behavio
      // @TODO talk to Christine about how she'd prefer we handle this
      if (buttonsData.left.value > 0 && buttonsData.right.value > 0) {
        console.warn("Gamepad '${this.xrGamepad.id}' with dpad '${this.dataSource.id}' is reporting left and right values > 0");
      }

      if (buttonsData.top.value > 0 && buttonsData.bottom.value > 0) {
        console.warn("Gamepad '${this.xrGamepad.id}' with dpad '${this.dataSource.id}' is reporting top and bottom values > 0");
      }
    }
    // @TODO this would be where we normalize the values if the override specifies it
    return buttonsData;
  }

  getWeightedVisualizations() {
    let weightedVisualizations = {};
    Object.keys(this.xrGamepadVisualResponses).forEach((key) => {
      weightedVisualizations[key] = this.xrGamepadVisualResponses[key].getWeightedVisualization();
    });
    return weightedVisualizations;
  }
};

module.exports = XRGamepadComponent;
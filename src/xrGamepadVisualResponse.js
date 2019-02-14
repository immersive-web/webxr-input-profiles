class XRGamepadVisualResponse {
  constructor(visualResponse, xrComponent) {
    this.xrComponent = xrComponent;
    this.visualResponse = visualResponse;
  }

  get target() {
    return this.visualResponse.target;
  }

  getWeightedVisualization() {
    if (this.xrComponent.isPressed() && this.visualResponse.onPress) {
      var visualResponse = this.visualResponse.onPress;
    } else if (this.xrComponent.isTouched() && this.visualResponse.onTouch) {
      var visualResponse = this.visualResponse.onTouch;
    } else {
      return;
    }

    let weightedResponse = {};
    let buttonsData = this.xrComponent.getButtonsData();
    let axesData = this.xrComponent.getAxesData();

    switch (visualResponse.degreesOfFreedom) {
      case 1:
        weightedResponse.buttonMin = { node: visualResponse.buttonMin, weight: 1 - buttonsData.button.value };
        weightedResponse.buttonMax = { node: visualResponse.buttonMax, weight: buttonsData.button.value };
        break;
      
      case 2:
        // @TODO fix this math
        if (this.xrComponent.hasAxes) {
          weightedResponse.left = { node: visualResponse.left, weight: 1 - axesData.xAxis };
          weightedResponse.right = { node: visualResponse.right, weight: axesData.xAxis };
          weightedResponse.top = { node: visualResponse.top, weight: 1 - axesData.yAxis };
          weightedResponse.bottom = { node: visualResponse.bottom, weight: axesData.yAxis };
        } else 
        {
          weightedResponse.left = { node: visualResponse.left, weight: buttonsData.left.value };
          weightedResponse.right = { node: visualResponse.right, weight: buttonsData.right.value };
          weightedResponse.top = { node: visualResponse.top, weight: buttonsData.top.value };
          weightedResponse.bottom = { node: visualResponse.bottom, weight: buttonsData.bottom.value };
        }
        break;

      case 3:
        // @TODO fix this math
        weightedResponse.buttonMin = { node: visualResponse.buttonMin, weight: 1 - buttonsData.button.value };
        weightedResponse.buttonMax = { node: visualResponse.buttonMax, weight: buttonsData.button.value };
        weightedResponse.left = { node: visualResponse.left, weight: 1 - axesData.xAxis };
        weightedResponse.right = { node: visualResponse.right, weight: axesData.xAxis };
        weightedResponse.top = { node: visualResponse.top, weight: 1 - axesData.yAxis };
        weightedResponse.bottom = { node: visualResponse.bottom, weight: axesData.yAxis };
    }

    return weightedResponse;
  }
};

module.exports = XRGamepadVisualResponse;
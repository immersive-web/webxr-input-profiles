class XRGamepadVisualResponse {
  constructor(visualResponse, xrComponent) {
    this.xrComponent = xrComponent;
    this.addVisualResponse(visualResponse);
    this.target = visualResponse.target;
  }

  addVisualResponse(visualResponse) {
    if (this.target && this.target != visualResponse.target) {
      throw new Error("Cannot add a visual response targeting '${visualResponse.target}' to one targeting '${this.target}'");
    }
    // Validate visualResponse doesn't conflict
    if (this[visualResponse.userAction]) {
      throw new Error("Cannot have two visual responses targeting '${visualResponse.target}' for '${visualResponse.userAction}'");
    }

    let degreesOfFreedom = 0;
    if (visualResponse.buttonMin && visualResponse.buttonMax) {
      degreesOfFreedom = 1;
    }

    if (visualResponse.left && visualResponse.right && visualResponse.top && visualResponse.bottom) {
      degreesOfFreedom += 2;
    }

    if (degreesOfFreedom < 1 || degreesOfFreedom > 3) {
      throw new Error("Unable to determine the number of degrees of freedom");
    }

    this[visualResponse.userAction] = {visualResponse: visualResponse, degreesOfFreedom: degreesOfFreedom};
  }

  getWeightedVisualization() {
    if (this.xrComponent.isPressed() && this.onPress) {
      var {visualResponse, degreesOfFreedom} = this.onPress;
    } else if (this.xrComponent.isTouched() && this.onTouch) {
      var {visualResponse, degreesOfFreedom} = this.onTouch;
    } else {
      return;
    }

    let weightedResponse = {};
    let buttonsData = this.xrComponent.getButtonsData();
    let axesData = this.xrComponent.getAxesData();

    switch (degreesOfFreedom) {
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
class XRVisualResponse {
  constructor(visualResponse, xrComponent) {
    this.xrComponent = xrComponent;
    this.visualResponse = visualResponse;

    this.axesOfMovement = 0;
    if (this.visualResponse.buttonMin && this.visualResponse.buttonMax) {
      this.axesOfMovement = 1;
    }

    if (this.visualResponse.left && this.visualResponse.right && this.visualResponse.top && this.visualResponse.bottom) {
      this.axesOfMovement += 2;
    }

    if (this.axesOfMovement < 1 || this.axesOfMovement > 3) {
      throw new Error("Unable to determine the number of axes of movement");
    }
  }

  getNodeWeights() {
    let weights = {};
    let buttonsData = this.xrComponent.getButtonsData();
    let axesData = this.xrComponent.getAxesData();
    
    // Normalize
    if (this.xrComponent.hasAxes) {
      axesData.xAxis = (axesData.xAxis + 1)/2;
      axesData.yAxis = (axesData.yAxis + 1)/2;
    }

    switch (this.axesOfMovement) {
      case 1:
        weights.buttonMin = 1 - buttonsData.button.value;
        weights.buttonMax = buttonsData.button.value;
        break;
      
      case 2:
        // @TODO fix this math
        if (this.xrComponent.hasAxes) {
          weights.left = 1 - axesData.xAxis;
          weights.right = axesData.xAxis;
          weights.top = 1 - axesData.yAxis;
          weights.bottom = axesData.yAxis;
        } else 
        {
          weights.left = buttonsData.left.value;
          weights.right = buttonsData.right.value;
          weights.top = buttonsData.top.value;
          weights.bottom = buttonsData.bottom.value;
        }
        break;

      case 3:
        // @TODO fix this math
        weights.buttonMin = 1 - buttonsData.button.value;
        weights.buttonMax = buttonsData.button.value;
        weights.left = 1 - axesData.xAxis;
        weights.right = axesData.xAxis;
        weights.top = 1 - axesData.yAxis;
        weights.bottom = axesData.yAxis;
    }

    return weights;
  }

  getNodeKeys() {
    let nodeKeys = Object.assign({}, this.visualResponse);
    delete nodeKeys["userAction"];
    return nodeKeys;
  }

};

module.exports = XRVisualResponse;
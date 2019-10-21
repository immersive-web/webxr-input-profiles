import Constants from './constants';
import VisualResponse from './visualResponse';

class Component {
  /**
   * @param {Object} componentId - Id of the component
   * @param {Object} componentDescription - Description of the component to be created
   */
  constructor(componentId, componentDescription) {
    if (!componentId
     || !componentDescription
     || !componentDescription.visualResponses
     || !componentDescription.gamepadIndices
     || Object.keys(componentDescription.gamepadIndices).length === 0) {
      throw new Error('Invalid arguments supplied');
    }

    this.id = componentId;
    this.description = componentDescription;

    // Build all the visual responses for this component
    this.visualResponses = {};
    this.description.visualResponses.forEach((visualResponseDescription) => {
      const visualResponse = new VisualResponse(visualResponseDescription);
      this.visualResponses[visualResponseDescription.rootNodeName] = visualResponse;
    });

    // Set default values
    const {
      [Constants.ComponentProperty.BUTTON]: buttonIndex,
      [Constants.ComponentProperty.X_AXIS]: xAxisIndex,
      [Constants.ComponentProperty.Y_AXIS]: yAxisIndex
    } = this.description.gamepadIndices;

    this.values = {
      state: Constants.ComponentState.DEFAULT,
      button: (buttonIndex !== undefined) ? 0 : undefined,
      xAxis: (xAxisIndex !== undefined) ? 0 : undefined,
      yAxis: (yAxisIndex !== undefined) ? 0 : undefined
    };
  }

  get type() {
    return this.description.type;
  }

  get rootNodeName() {
    return this.description.rootNodeName;
  }

  get labelAnchorNodeName() {
    return this.description.labelAnchorNodeName;
  }

  get touchPointNodeName() {
    return this.description.touchPointNodeName;
  }

  get data() {
    const data = { id: this.id, ...this.values };
    return data;
  }

  /**
   * @description Poll for updated data based on current gamepad state
   * @param {Object} gamepad - The gamepad object from which the component data should be polled
   */
  updateFromGamepad(gamepad) {
    const {
      [Constants.ComponentProperty.BUTTON]: buttonIndex,
      [Constants.ComponentProperty.X_AXIS]: xAxisIndex,
      [Constants.ComponentProperty.Y_AXIS]: yAxisIndex
    } = this.description.gamepadIndices;

    // Set the state to default before processing other data sources
    this.values.state = Constants.ComponentState.DEFAULT;

    // Get and normalize button
    if (buttonIndex !== undefined) {
      const gamepadButton = gamepad.buttons[buttonIndex];
      this.values.button = gamepadButton.value;
      this.values.button = (this.values.button < 0) ? 0 : this.values.button;
      this.values.button = (this.values.button > 1) ? 1 : this.values.button;

      // Set the state based on the button
      if (gamepadButton.pressed || this.values.button === 1) {
        this.values.state = Constants.ComponentState.PRESSED;
      } else if (gamepadButton.touched || this.values.button > Constants.ButtonTouchThreshold) {
        this.values.state = Constants.ComponentState.TOUCHED;
      }
    }

    // Get and normalize x axis value
    if (xAxisIndex !== undefined) {
      this.values.xAxis = gamepad.axes[xAxisIndex];
      this.values.xAxis = (this.values.xAxis < -1) ? -1 : this.values.xAxis;
      this.values.xAxis = (this.values.xAxis > 1) ? 1 : this.values.xAxis;

      // If the state is still default, check if the xAxis makes it touched
      if (this.values.state === Constants.ComponentState.DEFAULT
        && Math.abs(this.values.xAxis) > Constants.AxisTouchThreshold) {
        this.values.state = Constants.ComponentState.TOUCHED;
      }
    }

    // Get and normalize Y axis value
    if (yAxisIndex !== undefined) {
      this.values.yAxis = gamepad.axes[yAxisIndex];
      this.values.yAxis = (this.values.yAxis < -1) ? -1 : this.values.yAxis;
      this.values.yAxis = (this.values.yAxis > 1) ? 1 : this.values.yAxis;

      // If the state is still default, check if the yAxis makes it touched
      if (this.values.state === Constants.ComponentState.DEFAULT
        && Math.abs(this.values.yAxis) > Constants.AxisTouchThreshold) {
        this.values.state = Constants.ComponentState.TOUCHED;
      }
    }

    // Update the visual response weights based on the current component data
    Object.values(this.visualResponses).forEach((visualResponse) => {
      visualResponse.updateFromComponent(this.values);
    });
  }
}

export default Component;

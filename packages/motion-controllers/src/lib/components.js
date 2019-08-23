import Constants from './constants';
import VisualResponse from './visualResponse';

/**
 * @description The base class of all component types
 */
class Component {
  /**
   * @param {Object} profileDescription - Description of the profile that the component belongs to
   * @param {Object} componentDescription - Description of the component to be created
   */
  constructor(profileDescription, componentDescription) {
    this.componentDescription = componentDescription;
    this.dataSource = profileDescription.dataSources[this.componentDescription.dataSource];
    this.pressUnsupported = this.dataSource.pressUnsupported;
    if (this.dataSource.analogValues || this.dataSource.analogButtonValues) {
      this.analogButtonValues = true;
    }

    // Build all the visual responses for this component
    this.visualResponses = {};
    if (this.componentDescription.visualResponses) {
      this.componentDescription.visualResponses.forEach((visualResponseIndex) => {
        const visualResponseDescription = profileDescription.visualResponses[visualResponseIndex];
        const visualResponse = new VisualResponse(visualResponseDescription);
        this.visualResponses[visualResponseDescription.rootNodeName] = visualResponse;
      });
    }

    // Set default state
    this.state = Constants.ComponentState.DEFAULT;
  }

  /**
   * Update the visual response weights based on the current component data
   */
  updateVisualResponses() {
    Object.values(this.visualResponses).forEach((visualResponse) => {
      visualResponse.updateFromComponent(this);
    });
  }

  get id() {
    return this.dataSource.id;
  }

  get rootNodeName() {
    return this.componentDescription.root;
  }

  get labelNodeName() {
    return this.componentDescription.labelTransform;
  }
}

/**
 * @description Represents a button component
 */
class Button extends Component {
  /**
   * @param {Object} profileDescription - Description of the profile that the component belongs to
   * @param {Object} componentDescription - Description of the component to be created
   */
  constructor(profileDescription, componentDescription) {
    const { dataSourceType } = profileDescription.dataSources[componentDescription.dataSource];
    if (dataSourceType !== Constants.DataSourceType.BUTTON) {
      throw new Error('Button requires a matching dataSource.type');
    }

    super(profileDescription, componentDescription);

    // Set default state
    this.buttonValue = 0;
  }

  /**
   * @description Poll for updated data based on current gamepad state
   * @param {Object} gamepad - The gamepad object from which the component data should be polled
   */
  updateFromGamepad(gamepad) {
    const gamepadButton = gamepad.buttons[this.dataSource.buttonIndex];

    this.buttonValue = gamepadButton.value;
    this.buttonValue = (this.buttonValue < 0) ? 0 : this.buttonValue;
    this.buttonValue = (this.buttonValue > 1) ? 1 : this.buttonValue;

    if (gamepadButton.pressed
       || (this.buttonValue === 1 && !this.dataSource.pressUnsupported)) {
      this.state = Constants.ComponentState.PRESSED;
    } else if (gamepadButton.touched || (this.buttonValue > Constants.ButtonTouchThreshold)) {
      this.state = Constants.ComponentState.TOUCHED;
    } else {
      this.state = Constants.ComponentState.DEFAULT;
    }

    this.updateVisualResponses();
  }

  /**
   * @description Returns a subset of component data for simplified debugging
   */
  get data() {
    const { id, buttonValue, state } = this;
    const data = { id, buttonValue, state };
    return data;
  }
}

/**
 * @description Base class for Thumbsticks and Touchpads
 */
class Axes extends Component {
  /**
   * @param {Object} profileDescription - Description of the profile that the component belongs to
   * @param {Object} componentDescription - Description of the component to be created
   */
  constructor(profileDescription, componentDescription) {
    super(profileDescription, componentDescription);

    this.xAxis = 0;
    this.yAxis = 0;

    this.xAxisInverted = (this.dataSource.webVR_xAxisInverted === true);
    this.yAxisInverted = (this.dataSource.webVR_yAxisInverted === true);

    // https://github.com/immersive-web/webxr/issues/774
    // The thumbstick-controller, touchpad-controller, and
    // touchpad-thumbstick controllers may cause a button to
    // appear that can't be used if the hardware doesn't have one
    if (this.dataSource.buttonIndex !== undefined) {
      this.buttonValue = 0;
    } else {
      this.pressUnsupported = true;
    }
  }

  /**
   * @description Poll for updated data based on current gamepad state
   * @param {Object} gamepad - The gamepad object from which the component data should be polled
   */
  updateFromGamepad(gamepad) {
    // Get and normalize x axis value
    this.xAxis = gamepad.axes[this.dataSource.xAxisIndex];
    this.xAxis = (this.xAxis < -1) ? -1 : this.xAxis;
    this.xAxis = (this.xAxis > 1) ? 1 : this.xAxis;
    this.xAxis = this.xAxisInverted ? this.xAxis * -1 : this.xAxis;

    // Get and normalize y axis value
    this.yAxis = gamepad.axes[this.dataSource.yAxisIndex];
    this.yAxis = (this.yAxis < -1) ? -1 : this.yAxis;
    this.yAxis = (this.yAxis > 1) ? 1 : this.yAxis;
    this.yAxis = this.yAxisInverted ? this.yAxis * -1 : this.yAxis;

    // Get and normalize button value
    let gamepadButton;
    if (this.dataSource.buttonIndex !== undefined) {
      gamepadButton = gamepad.buttons[this.dataSource.buttonIndex];
      this.buttonValue = gamepadButton.value;
      this.buttonValue = (this.buttonValue < 0) ? 0 : this.buttonValue;
      this.buttonValue = (this.buttonValue > 1) ? 1 : this.buttonValue;
    }

    // Set the component state
    this.state = Constants.ComponentState.DEFAULT;
    if (gamepadButton) {
      if (gamepadButton.pressed
        || (this.buttonValue === 1 && !this.dataSource.pressUnsupported)) {
        this.state = Constants.ComponentState.PRESSED;
      } else if (gamepadButton.touched || this.buttonValue > Constants.ButtonTouchThreshold) {
        this.state = Constants.ComponentState.TOUCHED;
      }
    } else if (Math.abs(this.xAxis) > Constants.AxisTouchThreshold
               || Math.abs(this.yAxis) > Constants.AxisTouchThreshold) {
      this.state = Constants.ComponentState.TOUCHED;
    }

    this.updateVisualResponses();
  }

  /**
   * @description Returns a subset of component data for simplified debugging
   */
  get data() {
    const {
      id, xAxis, yAxis, state
    } = this;
    const data = {
      id, xAxis, yAxis, state
    };
    if (this.buttonValue !== undefined) {
      data.buttonValue = this.buttonValue;
    }
    return data;
  }
}

/**
 * @description Represents a Thumbstick component
 */
class Thumbstick extends Axes {
  /**
   * @param {Object} profileDescription - Description of the profile that the component belongs to
   * @param {Object} componentDescription - Description of the component to be created
   */
  constructor(profileDescription, componentDescription) {
    const { dataSourceType } = profileDescription.dataSources[componentDescription.dataSource];
    if (dataSourceType !== Constants.DataSourceType.THUMBSTICK) {
      throw new Error('Thumbstick requires a matching dataSource.type');
    }
    super(profileDescription, componentDescription);
  }
}

/**
 * @description Represents a Touchpad component
 */
class Touchpad extends Axes {
  /**
   * @param {Object} profileDescription - Description of the profile that the component belongs to
   * @param {Object} componentDescription - Description of the component to be created
   */
  constructor(profile, componentDescription) {
    const { dataSourceType } = profile.dataSources[componentDescription.dataSource];
    if (dataSourceType !== Constants.DataSourceType.TOUCHPAD) {
      throw new Error('Touchpad requires a matching dataSource.type');
    }
    super(profile, componentDescription);
  }

  get touchDotNodeName() {
    return this.componentDescription.touchpadDot;
  }
}

export {
  Thumbstick, Touchpad, Button, Axes, Component
};

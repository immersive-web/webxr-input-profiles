import Constants from './constants';
import VisualResponses from './visualResponses';

class Component {
  constructor(profile, componentDescription) {
    this.componentDescription = componentDescription;
    this.dataSource = profile.dataSources[this.componentDescription.dataSource];

    const visualResponseDescriptions = [];
    if (this.componentDescription.visualResponses) {
      this.componentDescription.visualResponses.forEach((visualResponseIndex) => {
        const visualResponseDescription = profile.visualResponses[visualResponseIndex];
        visualResponseDescriptions.push(visualResponseDescription);
      });
    }

    this.visualResponses = new VisualResponses(visualResponseDescriptions);

    this.state = Constants.ComponentState.DEFAULT;

    if (this.dataSource.analogValues || this.dataSource.analogButtonValues) {
      this.analogButtonValues = true;
    }

    this.pressUnsupported = this.dataSource.pressUnsupported;
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

class Button extends Component {
  constructor(profile, componentDescription) {
    const { dataSourceType } = profile.dataSources[componentDescription.dataSource];
    if (dataSourceType !== Constants.DataSourceType.BUTTON) {
      throw new Error('Button requires a matching dataSource.type');
    }

    super(profile, componentDescription);

    this.buttonValue = 0;
  }

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

    this.visualResponses.updateFromComponent(this);
  }

  get data() {
    const { id, buttonValue, state } = this;
    const data = { id, buttonValue, state };
    return data;
  }
}

class Axes extends Component {
  constructor(profile, componentDescription) {
    super(profile, componentDescription);

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

    this.visualResponses.updateFromComponent(this);
  }

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

class Thumbstick extends Axes {
  constructor(profile, componentDescription) {
    const { dataSourceType } = profile.dataSources[componentDescription.dataSource];
    if (dataSourceType !== Constants.DataSourceType.THUMBSTICK) {
      throw new Error('Thumbstick requires a matching dataSource.type');
    }
    super(profile, componentDescription);
  }
}

class Touchpad extends Axes {
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

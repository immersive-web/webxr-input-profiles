class MockGamepad {
  constructor(profile, handedness) {
    this.id = profile.id;
    if (handedness && profile.WebVR) {
      this.handedness = handedness;
    } else if (handedness) {
      throw new Error('Cannot provide handedness when mocking a WebXR gamepad');
    } else if (profile.WebVR) {
      throw new Error('Must supply a handedness when mocking a WebVR gamepad');
    }

    let maxButtonIndex = 0;
    let maxAxisIndex = 0;
    profile.dataSources.forEach((dataSource) => {
      if (dataSource.buttonIndex && dataSource.buttonIndex > maxButtonIndex) {
        maxButtonIndex = dataSource.buttonIndex;
      }

      if (dataSource.xAxisIndex && (dataSource.xAxisIndex > maxAxisIndex)) {
        maxAxisIndex = dataSource.xAxisIndex;
      }

      if (dataSource.yAxisIndex && (dataSource.yAxisIndex > maxAxisIndex)) {
        maxAxisIndex = dataSource.yAxisIndex;
      }
    });

    this.axes = [];
    while (this.axes.length <= maxAxisIndex) {
      this.axes.push(0);
    }

    this.buttons = [];
    while (this.buttons.length <= maxButtonIndex) {
      this.buttons.push({
        value: 0,
        touched: false,
        pressed: false
      });
    }
  }
}

export default MockGamepad;

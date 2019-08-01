/**
 * A false gamepad to be used in tests
 */
class MockGamepad {
  /**
   * @param {Object} profileDescription - The profile description to parse to determine the length
   * of the button and axes arrays
   * @param {string} handedness - When mocking a WebVR gamepad, the handedness to report
   */
  constructor(profileDescription, handedness) {
    this.id = profileDescription.id;
    if (handedness && profileDescription.WebVR) {
      this.hand = handedness;
    } else if (handedness) {
      throw new Error('Cannot supply handedness when mocking a WebXR gamepad');
    } else if (profileDescription.WebVR) {
      throw new Error('Must supply a handedness when mocking a WebVR gamepad');
    }

    // Loop through the profile description to determine how many elements to put in the buttons
    // and axes arrays
    let maxButtonIndex = 0;
    let maxAxisIndex = 0;
    profileDescription.dataSources.forEach((dataSource) => {
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

    // Fill the axes array
    this.axes = [];
    while (this.axes.length <= maxAxisIndex) {
      this.axes.push(0);
    }

    // Fill the buttons array
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

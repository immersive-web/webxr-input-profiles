/**
 * A false gamepad to be used in tests
 */
class MockGamepad {
  /**
   * @param {Object} profileDescription - The profile description to parse to determine the length
   * of the button and axes arrays
   * @param {string} handedness - The gamepad's handedness
   */
  constructor(profileDescription, handedness) {
    if (!profileDescription) {
      throw new Error('No profileDescription supplied');
    }

    if (!handedness) {
      throw new Error('No handedness supplied');
    }

    this.id = profileDescription.id;

    // Loop through the profile description to determine how many elements to put in the buttons
    // and axes arrays
    let maxButtonIndex = 0;
    let maxAxisIndex = 0;
    const handDescription = profileDescription.handedness[handedness];
    handDescription.components.forEach((componentId) => {
      const component = profileDescription.components[componentId];
      const dataSource = profileDescription.dataSources[component.dataSource];

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

    // Set a WebVR property
    if (profileDescription.WebVR) {
      this.hand = handedness;
    }
  }
}

export default MockGamepad;

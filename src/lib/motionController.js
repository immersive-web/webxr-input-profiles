import Constants from './constants';
import { Button, Thumbstick, Touchpad } from './components';

/**
  * @description Builds a motion controller with components and visual responses based on the
  * supplied profile description. Data is polled from the xrInputSource's gamepad.
  * @author Nell Waliczek / https://github.com/NellWaliczek
*/
class MotionController {
  /**
   * @param {Object} xrInputSource - The XRInputSource to build the MotionController around
   * @param {Object} profile - The best matched profile description for the supplied xrInputSource
   */
  constructor(xrInputSource, profile) {
    if (!xrInputSource) {
      throw new Error('No xrInputSource supplied');
    }

    if (!profile) {
      throw new Error('No profile supplied');
    }

    this.profile = profile;
    this.xrInputSource = xrInputSource;

    // Build child components as described in the profile description
    this.components = {};
    this.hand = this.profile.handedness[xrInputSource.handedness];
    this.hand.components.forEach((componentIndex) => {
      const componentDescription = this.profile.components[componentIndex];
      const dataSource = this.profile.dataSources[componentDescription.dataSource];
      switch (dataSource.dataSourceType) {
        case Constants.DataSourceType.THUMBSTICK:
          this.components[dataSource.id] = new Thumbstick(profile, componentDescription);
          break;

        case Constants.DataSourceType.TOUCHPAD:
          this.components[dataSource.id] = new Touchpad(profile, componentDescription);
          break;

        case Constants.DataSourceType.BUTTON:
          this.components[dataSource.id] = new Button(profile, componentDescription);
          break;

        default:
          throw new Error(`Unknown data source type: ${dataSource.dataSourceType}`);
      }
    });

    // Initialize components based on current gamepad state
    this.updateFromGamepad();
  }

  get id() {
    return this.profile.id;
  }

  get assetPath() {
    let assetPath;
    if (this.profile.baseUri) {
      assetPath = `${this.profile.baseUri}/${this.hand.asset}`;
    } else {
      assetPath = this.hand.asset;
    }
    return assetPath;
  }

  get gripSpace() {
    return this.xrInputSource.gripSpace;
  }

  get targetRaySpace() {
    return this.xrInputSource.targetRaySpace;
  }

  /**
   * @description Returns a subset of component data for simplified debugging
   */
  get data() {
    const data = [];
    Object.values(this.components).forEach((component) => {
      data.push(component.data);
    });
    return data;
  }

  /**
   * @description Poll for updated data based on current gamepad state
   */
  updateFromGamepad() {
    Object.values(this.components).forEach((component) => {
      component.updateFromGamepad(this.xrInputSource.gamepad);
    });
  }
}

export default MotionController;

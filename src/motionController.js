import Constants from './constants';
import { Button, Thumbstick, Touchpad } from './components';

/**
  * @description Builds a motion controller with enumerated thumbstick, touchpad, trigger,
  * etc components
  * @author Nell Waliczek / https://github.com/NellWaliczek
*/
class MotionController {
  /**
   * @param {Object} xrInputSource - The XRInputSource
   * @param {Object} profile - The profile to apply
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

    this.updateFromGamepad();
  }

  get id() {
    return this.profile.id;
  }

  get assetPath() {
    return `${this.profile.baseUri}/${this.hand.asset}`;
  }

  get gripSpace() {
    return this.xrInputSource.gripSpace;
  }

  get targetRaySpace() {
    return this.xrInputSource.targetRaySpace;
  }

  get data() {
    const data = [];
    Object.values(this.components).forEach((component) => {
      data.push(component.data);
    });
    return data;
  }

  updateFromGamepad() {
    Object.values(this.components).forEach((component) => {
      component.updateFromGamepad(this.xrInputSource.gamepad);
    });
  }
}

export default MotionController;

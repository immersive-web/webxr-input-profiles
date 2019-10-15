import Constants from './constants';

/** @constant {Object} */
const defaultComponentValues = {
  xAxis: 0,
  yAxis: 0,
  button: 0,
  state: Constants.ComponentState.DEFAULT
};

/**
 * @description Converts an X, Y coordinate from the range -1 to 1 (as reported by the Gamepad
 * API) to the range 0 to 1 (for interpolation). Also caps the X, Y values to be bounded within
 * a circle. This ensures that thumbsticks are not animated outside the bounds of their physical
 * range of motion and touchpads do not report touch locations off their physical bounds.
 * @param {number} x The original x coordinate in the range -1 to 1
 * @param {number} y The original y coordinate in the range -1 to 1
 */
function normalizeAxes(x = 0, y = 0) {
  let xAxis = x;
  let yAxis = y;

  // Determine if the point is outside the bounds of the circle
  // and, if so, place it on the edge of the circle
  const hypotenuse = Math.sqrt((x * x) + (y * y));
  if (hypotenuse > 1) {
    const theta = Math.atan2(y, x);
    xAxis = Math.cos(theta);
    yAxis = Math.sin(theta);
  }

  // Scale and move the circle so values are in the interpolation range.  The circle's origin moves
  // from (0, 0) to (0.5, 0.5). The circle's radius scales from 1 to be 0.5.
  const result = {
    normalizedXAxis: (xAxis * 0.5) + 0.5,
    normalizedYAxis: (yAxis * 0.5) + 0.5
  };
  return result;
}

/**
 * Contains the description of how the 3D model should visually respond to a specific user input.
 * This is accomplished by initializing the object with the name of a node in the 3D model and
 * property that need to be modified in response to user input, the name of the nodes representing
 * the allowable range of motion, and the name of the input which triggers the change. In response
 * to the named input changing, this object computes the appropriate weighting to use for
 * interpolating between the range of motion nodes.
 */
class VisualResponse {
  constructor(visualResponseDescription) {
    // Copies the description properties into a member attribute for modification
    this.description = Object.assign(visualResponseDescription);

    // Looks for a root node name and sets a default if one is not defined
    if (!this.description.targetNodeName) {
      if (this.description.property === 'visibility') {
        this.description.targetNodeName = this.description.rootNodeName;
      } else {
        this.description.targetNodeName = 'VALUE';
      }
    }

    // Looks for min/max node names and sets defaults if they are not defined
    this.description.maxNodeName = (this.description.maxNodeName) ? this.description.maxNodeName : 'MAX';
    this.description.minNodeName = (this.description.minNodeName) ? this.description.minNodeName : 'MIN';

    // Looks for the property name and sets a default if it is not defined
    this.description.property = (this.description.property) ? this.description.property : 'transform';

    // Initializes the response's current value based on default data
    this.updateFromComponent(defaultComponentValues);
  }

  /**
   * Computes the visual response's interpolation weight based on component state
   * @param {Object} component - The component from which to update
   * @param {number} xAxis - The reported X axis value of the component
   * @param {number} yAxis - The reported Y axis value of the component
   * @param {number} button - The reported value of the component's button
   * @param {string} state - The component's active state
   */
  updateFromComponent({
    xAxis, yAxis, button, state
  }) {
    const { normalizedXAxis, normalizedYAxis } = normalizeAxes(xAxis, yAxis);
    switch (this.description.componentProperty) {
      case Constants.ComponentProperty.X_AXIS:
        this.value = (this.description.states.includes(state)) ? normalizedXAxis : 0.5;
        break;
      case Constants.ComponentProperty.Y_AXIS:
        this.value = (this.description.states.includes(state)) ? normalizedYAxis : 0.5;
        break;
      case Constants.ComponentProperty.BUTTON:
        this.value = (this.description.states.includes(state)) ? button : 0;
        break;
      case Constants.ComponentProperty.STATE:
        if (this.description.property === 'visibility') {
          this.value = (this.description.states.includes(state));
        } else {
          this.value = this.description.states.includes(state) ? 1.0 : 0.0;
        }
        break;
      default:
        throw new Error('Unexpected visualResponse source');
    }
  }
}

export default VisualResponse;

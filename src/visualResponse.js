import Constants from './constants';

function normalizeAxes(x, y) {
  let xAxis = x;
  let yAxis = y;
  const hypotenuse = Math.sqrt((x * x) + (y * y));
  if (hypotenuse > 1) {
    if (x !== 0 || y !== 0) {
      const theta = Math.atan2(y, x);
      xAxis = Math.cos(theta);
      yAxis = Math.sin(theta);
    }
  }
  const result = {
    normalizedXAxis: (xAxis * 0.5) + 0.5,
    normalizedYAxis: (yAxis * 0.5) + 0.5
  };
  return result;
}

class VisualResponse {
  constructor(visualResponseDescription) {
    this.description = Object.assign(visualResponseDescription);
    if (!this.description.targetNodeName) {
      if (this.description.property === 'visibility') {
        this.description.targetNodeName = this.description.rootNodeName;
      } else {
        this.description.targetNodeName = 'VALUE';
      }
    }

    if (this.description.source === 'buttonValue' || this.description.source === 'state') {
      this.description.maxNodeName = (this.description.maxNodeName) ? this.description.maxNodeName : 'PRESSED';
      this.description.minNodeName = (this.description.minNodeName) ? this.description.minNodeName : 'UNPRESSED';
    } else {
      this.description.maxNodeName = (this.description.maxNodeName) ? this.description.maxNodeName : 'MAX';
      this.description.minNodeName = (this.description.minNodeName) ? this.description.minNodeName : 'MIN';
    }

    this.description.property = (this.description.property) ? this.description.property : 'transform';
    this.updateFromComponent({
      xAxis: 0,
      yAxis: 0,
      buttonValue: 0,
      state: Constants.ComponentState.DEFAULT
    });
  }

  updateFromComponent({
    xAxis, yAxis, buttonValue, state
  }) {
    const { normalizedXAxis, normalizedYAxis } = normalizeAxes(xAxis, yAxis);
    switch (this.description.source) {
      case 'xAxis':
        this.value = (this.description.states.includes(state)) ? normalizedXAxis : 0.5;
        break;
      case 'yAxis':
        this.value = (this.description.states.includes(state)) ? normalizedYAxis : 0.5;
        break;
      case 'buttonValue':
        this.value = (this.description.states.includes(state)) ? buttonValue : 0;
        break;
      case 'state':
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

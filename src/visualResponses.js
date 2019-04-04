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
    xAxis: (xAxis * 0.5) + 0.5,
    yAxis: (yAxis * 0.5) + 0.5
  };
  return result;
}

class VisualResponses {
  constructor(visualResponseDescriptions) {
    this.descriptions = visualResponseDescriptions;
    this.responses = [];
    this.descriptions.forEach((description) => {
      let { targetNodeName } = description;
      if (!targetNodeName) {
        if (description.property === 'visibility') {
          targetNodeName = description.rootNodeName;
        } else {
          targetNodeName = 'VALUE';
        }
      }

      let maxNodeName;
      let minNodeName;
      if (description.source === 'buttonValue' || description.source === 'state') {
        maxNodeName = (description.maxNodeName) ? description.maxNodeName : 'PRESSED';
        minNodeName = (description.minNodeName) ? description.minNodeName : 'UNPRESSED';
      } else {
        maxNodeName = (description.maxNodeName) ? description.maxNodeName : 'MAX';
        minNodeName = (description.minNodeName) ? description.minNodeName : 'MIN';
      }

      const property = (description.property) ? description.property : 'transform';

      const visualResponse = {
        targetNodeName, maxNodeName, minNodeName, property
      };
      visualResponse.rootNodeName = description.rootNodeName;
      visualResponse.states = description.states;
      visualResponse.source = description.source;

      this.responses.push(visualResponse);
    });

    this.weightedNodes = [];
  }

  updateFromComponent(component) {
    this.weightedNodes = [];
    this.responses.forEach((visualResponse) => {
      const weightedNode = {
        value: VisualResponses.getValue(component, visualResponse),
        rootNodeName: visualResponse.rootNodeName,
        minNodeName: visualResponse.minNodeName,
        maxNodeName: visualResponse.maxNodeName,
        targetNodeName: visualResponse.targetNodeName,
        property: visualResponse.property
      };
      this.weightedNodes.push(weightedNode);
    });
  }

  static getValue(component, visualResponse) {
    let value;
    const { xAxis, yAxis } = normalizeAxes(component.xAxis, component.yAxis);
    switch (visualResponse.source) {
      case 'xAxis':
        value = (visualResponse.states.includes(component.state)) ? xAxis : 0.5;
        break;
      case 'yAxis':
        value = (visualResponse.states.includes(component.state)) ? yAxis : 0.5;
        break;
      case 'buttonValue':
        value = (visualResponse.states.includes(component.state)) ? component.buttonValue : 0;
        break;
      case 'state':
        if (visualResponse.property === 'visibility') {
          value = (visualResponse.states.includes(component.state));
        } else {
          value = visualResponse.states.includes(component.state) ? 1.0 : 0.0;
        }
        break;
      default:
        throw new Error('Unexpected visualResponse source');
    }

    return value;
  }
}

export default VisualResponses;

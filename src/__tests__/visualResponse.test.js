import Constants from '../constants';
import VisualResponse from '../visualResponse';

describe('Construction tests', () => {
  test('Fail to construct visual response when description is not provided', () => {
    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const visualResponses = new VisualResponse(undefined);
    }).toThrow();

    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const visualResponses = new VisualResponse(null);
    }).toThrow();

    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const visualResponses = new VisualResponse({});
    }).toThrow();
  });
  test.each([
    ['buttonValue', 'PRESSED', 'UNPRESSED'],
    ['state', 'PRESSED', 'UNPRESSED'],
    ['xAxis', 'MAX', 'MIN'],
    ['yAxis', 'MAX', 'MIN']
  ])('Create with %s source and no additional properties', (source, minNodeName, maxNodeName) => {
    const responseDescription = {
      rootNodeName: 'ROOT',
      source,
      states: [Constants.ComponentState.DEFAULT]
    };

    const expectedResponse = Object.assign(responseDescription, {
      targetNodeName: 'ROOT',
      minNodeName,
      maxNodeName,
      property: 'transform'
    });

    const visualResponse = new VisualResponse(responseDescription);
    expect(visualResponse).toBeDefined();
    expect(visualResponse.description).toEqual(expectedResponse);
  });

  test('Create with explicit properties', () => {
    const responseDescription = {
      rootNodeName: 'ROOT',
      source: 'buttonValue',
      states: [Constants.ComponentState.DEFAULT],
      targetNodeName: 'TARGET',
      minNodeName: 'MY MIN NODE',
      maxNodeName: 'MY MAX NODE',
      property: 'visibility'
    };

    const visualResponse = new VisualResponse(responseDescription);
    expect(visualResponse).toBeDefined();
    expect(visualResponse.description).toMatchObject(responseDescription);
  });
});

describe('Weighting tests', () => {
  test('buttonValue', () => {
    const component = {
      state: Constants.ComponentState.DEFAULT,
      buttonValue: 0.8
    };

    const responseDescription = {
      source: 'buttonValue',
      states: [Constants.ComponentState.DEFAULT],
      property: 'transform'
    };

    const visualResponse = new VisualResponse(responseDescription);

    visualResponse.updateFromComponent(component);
    expect(visualResponse.value).toEqual(0.8);

    component.state = Constants.ComponentState.TOUCHED;
    visualResponse.updateFromComponent(component);
    expect(visualResponse.value).toEqual(0);
  });

  test('axis values in inactive state', () => {
    const component = {
      state: Constants.ComponentState.TOUCHED,
      xAxis: 1,
      yAxis: 1
    };

    const xAxisResponseDescription = {
      source: 'xAxis',
      states: [Constants.ComponentState.DEFAULT],
      property: 'transform'
    };

    const yAxisResponseDescription = {
      source: 'yAxis',
      states: [Constants.ComponentState.DEFAULT],
      property: 'transform'
    };

    const xAxisResponse = new VisualResponse(xAxisResponseDescription);
    const yAxisResponse = new VisualResponse(yAxisResponseDescription);

    xAxisResponse.updateFromComponent(component);
    expect(xAxisResponse.value).toEqual(0.5);

    yAxisResponse.updateFromComponent(component);
    expect(yAxisResponse.value).toEqual(0.5);
  });

  /* eslint-disable indent */
  test.each`
    xAxis  | yAxis  | expectedX | expectedY
    ${0}   | ${0}   | ${0.5}    | ${0.5}
    ${-1}  | ${0}   | ${0}      | ${0.5}
    ${1}   | ${0}   | ${1}      | ${0.5}
    ${0}   | ${-1}  | ${0.5}    | ${0}
    ${0}   | ${1}   | ${0.5}    | ${1}
    ${1}   | ${-1}  | ${0.8536} | ${0.1464}
    ${-1}  | ${1}   | ${0.1464} | ${0.8536}
    ${1}   | ${1}   | ${0.8536} | ${0.8536}
    ${-1}  | ${-1}  | ${0.1464} | ${0.1464}
    ${0.2} | ${0.3} | ${0.6}    | ${0.65}
    ${1}   | ${1}   | ${0.8536} | ${0.8536}
    ${1}   | ${1}   | ${0.8536} | ${0.8536}
  `('axes values x=$xAxis y=$yAxis', ({
    xAxis, yAxis, expectedX, expectedY
  }) => {
    const component = {
      state: Constants.ComponentState.DEFAULT,
      xAxis,
      yAxis
    };

    const xAxisResponseDescription = {
      source: 'xAxis',
      states: [Constants.ComponentState.DEFAULT],
      property: 'transform'
    };

    const yAxisResponseDescription = {
      source: 'yAxis',
      states: [Constants.ComponentState.DEFAULT],
      property: 'transform'
    };

    const xAxisResponse = new VisualResponse(xAxisResponseDescription);
    const yAxisResponse = new VisualResponse(yAxisResponseDescription);

    xAxisResponse.updateFromComponent(component);
    yAxisResponse.updateFromComponent(component);

    expect(xAxisResponse.value).toBeCloseTo(expectedX, 4);
    expect(yAxisResponse.value).toBeCloseTo(expectedY, 4);
  });
  /* eslint-enable */

  test('state for visibility property', () => {
    const component = {
      state: Constants.ComponentState.DEFAULT
    };

    const responseDescription = {
      source: 'state',
      states: [Constants.ComponentState.DEFAULT],
      property: 'visibility'
    };

    const response = new VisualResponse(responseDescription);

    expect(response.value).toEqual(true);

    component.state = Constants.ComponentState.TOUCHED;
    response.updateFromComponent(component);
    expect(response.value).toEqual(false);
  });

  test('state for transform property', () => {
    const component = {
      state: Constants.ComponentState.DEFAULT
    };

    const responseDescription = {
      source: 'state',
      states: [Constants.ComponentState.DEFAULT]
    };

    const response = new VisualResponse(responseDescription);

    expect(response.value).toEqual(1);

    component.state = Constants.ComponentState.TOUCHED;
    response.updateFromComponent(component);
    expect(response.value).toEqual(0);
  });
});

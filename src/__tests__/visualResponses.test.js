import Constants from '../constants';
import VisualResponses from '../visualResponses';

describe('Construction tests', () => {
  test('Fail to construct visual response when description is not provided', () => {
    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const visualResponses = new VisualResponses(undefined);
    }).toThrow();

    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const visualResponses = new VisualResponses(null);
    }).toThrow();
  });

  test('Create with empty descriptions array', () => {
    const visualResponses = new VisualResponses([]);
    expect(visualResponses).toBeDefined();
    expect(visualResponses.responses).toEqual([]);
    expect(visualResponses.weightedNodes).toEqual([]);
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

    const visualResponses = new VisualResponses([responseDescription]);
    expect(visualResponses).toBeDefined();
    expect(visualResponses.responses).toEqual([expectedResponse]);
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

    const visualResponses = new VisualResponses([responseDescription]);
    expect(visualResponses).toBeDefined();
    expect(visualResponses.responses).toHaveLength(1);
    expect(visualResponses.responses[0]).toMatchObject(responseDescription);
  });
});

describe('Weighting tests', () => {
  test('buttonValue', () => {
    const component = {
      state: Constants.ComponentState.DEFAULT,
      buttonValue: 0.8
    };

    const response = {
      source: 'buttonValue',
      states: [Constants.ComponentState.DEFAULT],
      property: 'transform'
    };

    const activeValue = VisualResponses.getValue(component, response);
    expect(activeValue).toEqual(0.8);

    component.state = Constants.ComponentState.TOUCHED;
    const inactiveValue = VisualResponses.getValue(component, response);
    expect(inactiveValue).toEqual(0);
  });

  test('axis values in inactive state', () => {
    const component = {
      state: Constants.ComponentState.TOUCHED,
      xAxis: 1,
      yAxis: 1
    };

    const xAxisResponse = {
      source: 'xAxis',
      states: [Constants.ComponentState.DEFAULT],
      property: 'transform'
    };

    const yAxisResponse = {
      source: 'yAxis',
      states: [Constants.ComponentState.DEFAULT],
      property: 'transform'
    };

    const xValue = VisualResponses.getValue(component, xAxisResponse);
    expect(xValue).toEqual(0.5);

    const yValue = VisualResponses.getValue(component, yAxisResponse);
    expect(yValue).toEqual(0.5);
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

    const xAxisResponse = {
      source: 'xAxis',
      states: [Constants.ComponentState.DEFAULT],
      property: 'transform'
    };

    const yAxisResponse = {
      source: 'yAxis',
      states: [Constants.ComponentState.DEFAULT],
      property: 'transform'
    };

    const xValue = VisualResponses.getValue(component, xAxisResponse);
    expect(xValue).toBeCloseTo(expectedX, 4);

    const yValue = VisualResponses.getValue(component, yAxisResponse);
    expect(yValue).toBeCloseTo(expectedY, 4);
  });
  /* eslint-enable */

  test('state for visibility property', () => {
    const component = {
      state: Constants.ComponentState.DEFAULT
    };

    const response = {
      source: 'state',
      states: [Constants.ComponentState.DEFAULT],
      property: 'visibility'
    };

    const activeValue = VisualResponses.getValue(component, response);
    expect(activeValue).toEqual(true);

    component.state = Constants.ComponentState.TOUCHED;
    const inactiveValue = VisualResponses.getValue(component, response);
    expect(inactiveValue).toEqual(false);
  });

  test('state for transform property', () => {
    const component = {
      state: Constants.ComponentState.DEFAULT
    };

    const response = {
      source: 'state',
      states: [Constants.ComponentState.DEFAULT]
    };

    const activeValue = VisualResponses.getValue(component, response);
    expect(activeValue).toEqual(1);

    component.state = Constants.ComponentState.TOUCHED;
    const inactiveValue = VisualResponses.getValue(component, response);
    expect(inactiveValue).toEqual(0);
  });
});

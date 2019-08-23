const TestHelpers = require('./testHelpers');

const validator = TestHelpers.getValidator('visualResponses.schema.json');

test('Valid visualResponse', () => {
  const visualResponses = [{
    rootNodeName: 'NODE_NAME',
    source: 'buttonValue',
    states: ['default']
  }];
  const valid = validator(visualResponses);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test.each([
  'buttonValue',
  'xAxis',
  'yAxis',
  'state'
])('Valid source: %s', (source) => {
  const visualResponses = [{
    rootNodeName: 'NODE_NAME',
    source,
    states: ['default']
  }];
  const valid = validator(visualResponses);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test.each([
  [['default']],
  [['touched']],
  [['pressed']],
  [['default', 'touched']],
  [['default', 'pressed']],
  [['touched', 'pressed']],
  [['default', 'touched', 'pressed']]
])('Valid states: %s', (states) => {
  const visualResponses = [{
    rootNodeName: 'NODE_NAME',
    source: 'buttonValue',
    states
  }];
  const valid = validator(visualResponses);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test.each([
  ['property', 'transform'],
  ['targetNodeName', 'TARGET'],
  ['minNodeName', 'MIN'],
  ['maxNodeName', 'MAX']
])('Valid additional property %s set to %s', (property, value) => {
  const visualResponses = [{
    rootNodeName: 'NODE_NAME',
    source: 'buttonValue',
    states: ['default'],
    [property]: value
  }];
  const valid = validator(visualResponses);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test('Invalid no root node', () => {
  const visualResponses = [{
    source: 'buttonValue',
    states: ['default']
  }];
  expect(validator(visualResponses)).toBe(false);
});

test('Invalid no source', () => {
  const visualResponses = [{
    rootNodeName: 'NODE_NAME',
    states: ['default']
  }];
  expect(validator(visualResponses)).toBe(false);
});

test('Invalid source value', () => {
  const visualResponses = [{
    rootNodeName: 'NODE_NAME',
    source: 'skjfadsjalsjdf',
    states: ['default']
  }];
  expect(validator(visualResponses)).toBe(false);
});

test('Invalid no states', () => {
  const visualResponses = [{
    rootNodeName: 'NODE_NAME',
    source: 'buttonValue'
  }];
  expect(validator(visualResponses)).toBe(false);
});

test('Invalid states empty', () => {
  const visualResponses = [{
    rootNodeName: 'NODE_NAME',
    source: 'buttonValue',
    states: []
  }];
  expect(validator(visualResponses)).toBe(false);
});

test('Invalid property value', () => {
  const visualResponses = [{
    rootNodeName: 'NODE_NAME',
    source: 'buttonValue',
    states: ['default'],
    property: 'dslkljfasljslkfas'
  }];
  expect(validator(visualResponses)).toBe(false);
});

test('Visibility property', () => {
  const visualResponses = [{
    rootNodeName: 'NODE_NAME',
    source: 'state',
    states: ['default'],
    property: 'visibility'
  }];

  const valid = validator(visualResponses);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  visualResponses[0].source = 'buttonValue';
  expect(validator(visualResponses)).toBe(false);

  visualResponses[0].source = 'xAxis';
  expect(validator(visualResponses)).toBe(false);

  visualResponses[0].source = 'yAxis';
  expect(validator(visualResponses)).toBe(false);
});

test('Invalid additional values', () => {
  const visualResponses = [{
    rootNodeName: 'NODE_NAME',
    source: 'buttonValue',
    states: ['default'],
    invalid: 'dslkljfasljslkfas'
  }];
  expect(validator(visualResponses)).toBe(false);
});

test('Invalid duplicate entries', () => {
  const visualResponse = {
    rootNodeName: 'NODE_NAME',
    source: 'buttonValue',
    states: ['default']
  };
  expect(validator([visualResponse, visualResponse])).toBe(false);
});

test('Invalid array length', () => {
  expect(validator([])).toBe(false);
});

const TestHelpers = require('./testHelpers');

const validator = TestHelpers.getValidator('components.schema.json', ['profile.index.schema.json']);

const validComponent = Object.freeze({
  dataSource: 0,
  root: 'root node',
  labelTransform: 'labelTransform node'
});

test('Valid component', () => {
  let valid = false;
  const component = TestHelpers.copyJsonObject(validComponent);

  valid = validator([component]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  component.visualResponses = [0];
  valid = validator([component]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test('Invalid array length', () => {
  expect(validator([])).toBe(false);
});

test('Duplicates invalid', () => {
  expect(validator([validComponent, validComponent])).toBe(false);
});

test('Invalid dataSource', () => {
  const component = TestHelpers.copyJsonObject(validComponent);
  delete component.dataSource;
  expect(validator([component])).toBe(false);
});

test('Invalid root', () => {
  const component = TestHelpers.copyJsonObject(validComponent);
  delete component.root;
  expect(validator([component])).toBe(false);
});

test('Invalid labelTransform', () => {
  const component = TestHelpers.copyJsonObject(validComponent);
  delete component.labelTransform;
  expect(validator([component])).toBe(false);
});

test('Invalid visualResponses', () => {
  const component = TestHelpers.copyJsonObject(validComponent);

  component.visualResponses = [];
  expect(validator([component])).toBe(false);

  component.visualResponses = [0, 0];
  expect(validator([component])).toBe(false);
});

test('invalid additional properties', () => {
  const component = TestHelpers.copyJsonObject(validComponent);
  component.someNonsense = {};
  expect(validator([component])).toBe(false);
});

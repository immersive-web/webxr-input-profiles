const TestHelpers = require('./testHelpers');

const validator = TestHelpers.getValidator('hand.schema.json', ['profile.index.schema.json']);

const validHand = Object.freeze({
  asset: 'asset uri',
  root: 'root node',
  components: [0],
  selectionComponent: 0
});

test('Valid hand', () => {
  let valid = false;
  const hand = TestHelpers.copyJsonObject(validHand);

  valid = validator(hand);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test('Invalid asset', () => {
  const hand = TestHelpers.copyJsonObject(validHand);

  delete hand.asset;
  expect(validator(hand)).toBe(false);
});

test('Invalid root', () => {
  const hand = TestHelpers.copyJsonObject(validHand);

  delete hand.root;
  expect(validator(hand)).toBe(false);
});

test('Invalid components', () => {
  const hand = TestHelpers.copyJsonObject(validHand);

  delete hand.components;
  expect(validator(hand)).toBe(false);

  hand.components = [];
  expect(validator(hand)).toBe(false);

  hand.components = [0, 0];
  expect(validator(hand)).toBe(false);
});

test('Invalid selectionComponent', () => {
  const hand = TestHelpers.copyJsonObject(validHand);

  delete hand.selectionComponent;
  expect(validator(hand)).toBe(false);
});

test('invalid additional properties', () => {
  const hand = TestHelpers.copyJsonObject(validHand);
  hand.someNonsense = {};
  expect(validator(hand)).toBe(false);
});

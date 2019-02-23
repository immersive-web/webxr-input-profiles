const TestHelpers = require("../testHelpers.js");
const validator = TestHelpers.getValidator("hand.schema.json", ["mapping.index.schema.json"]);
const validHand = Object.freeze({
  "asset": "asset uri",
  "root": "root node",
  "components": [0]
});

test("Valid hand", () => {
  let valid = false;
  let hand = TestHelpers.copyJsonObject(validHand);
  
  valid = validator(hand);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  hand.primaryButtonComponent = 0;
  valid = validator(hand);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
  
  hand.primaryAxesComponent = 1;
  valid = validator(hand);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
  
  delete hand.primaryButtonComponent;
  valid = validator(hand);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test("Invalid asset", () => {
  let hand = TestHelpers.copyJsonObject(validHand);
  
  delete hand.asset;
  expect(validator(hand)).toBe(false);
});

test("Invalid root", () => {
  let hand = TestHelpers.copyJsonObject(validHand);
  
  delete hand.root;
  expect(validator(hand)).toBe(false);
});

test("Invalid components", () => {
  let hand = TestHelpers.copyJsonObject(validHand);
  
  delete hand.components;
  expect(validator(hand)).toBe(false);
  
  hand.components = [];
  expect(validator(hand)).toBe(false);
  
  hand.components = [0, 0];
  expect(validator(hand)).toBe(false);
});

test("invalid additional properties", () => {
  let hand = TestHelpers.copyJsonObject(validHand);
  hand.someNonsense = {};
  expect(validator(hand)).toBe(false);
});
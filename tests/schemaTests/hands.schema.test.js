const TestHelpers = require("../testHelpers.js");
const validator = TestHelpers.getValidator("handedness.schema.json", ["hand.schema.json", "mapping.index.schema.json"]);
const validHand = Object.freeze({
  "asset": "asset uri",
  "root": "root node",
  "components": [0]
});

test("valid handedness", () => {
  let valid = false;
  let handedness = {
    none: validHand
  };
  
  valid = validator(handedness);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  handedness.left = validHand;
  handedness.right = validHand;  
  valid = validator(handedness);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  delete handedness.none;
  valid = validator(handedness);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test("Invalid hand pairings", () => {
  let handedness = {
    none: validHand,
    right: validHand
  };
  expect(validator(handedness)).toBe(false);

  handedness = {
    none: validHand,
    left: validHand
  };  
  expect(validator(handedness)).toBe(false);
});

test("Invalid single hand", () => {
  let handedness = {
    right: validHand
  };
  expect(validator(handedness)).toBe(false);

  handedness = {
    left: validHand
  };  
  expect(validator(handedness)).toBe(false);
});

test("no valid hand in handedness", () => {
  let handedness = {};
  expect(validator(handedness)).toBe(false);
});

test("invalid additional properties", () => {
  let handedness = {
    none: validHand,
    someNonsense: {}
  };
  expect(validator(handedness)).toBe(false);
});
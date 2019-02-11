const testHelpers = require("../testHelpers.js");
const validator = testHelpers.getValidator("hands.schema.json", ["hand.schema.json", "mapping.index.schema.json"]);
const validHand = Object.freeze({
  "asset": "asset uri",
  "root": "root node",
  "components": [0]
});

test("valid hands", () => {
  let valid = false;
  let hands = {
    neutral: validHand
  };
  
  valid = validator(hands);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  hands.left = validHand;
  hands.right = validHand;  
  valid = validator(hands);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  delete hands.neutral;
  valid = validator(hands);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test("Invalid hand pairings", () => {
  let hands = {
    neutral: validHand,
    right: validHand
  };
  expect(validator(hands)).toBe(false);

  hands = {
    neutral: validHand,
    left: validHand
  };  
  expect(validator(hands)).toBe(false);
});

test("Invalid single hand", () => {
  let hands = {
    right: validHand
  };
  expect(validator(hands)).toBe(false);

  hands = {
    left: validHand
  };  
  expect(validator(hands)).toBe(false);
});

test("no valid hand in hands", () => {
  let hands = {};
  expect(validator(hands)).toBe(false);
});

test("invalid additional properties", () => {
  let hands = {
    neutral: validHand,
    someNonsense: {}
  };
  expect(validator(hands)).toBe(false);
});
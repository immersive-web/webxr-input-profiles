const testHelpers = require("./testHelpers.js");

test("left/right hands", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let hands = mapping.gamepad.hands;
  let hand = hands.neutral;

  delete hands["neutral"];
  hands["left"] = hand;
  hands["right"] = hand;

  let valid = testHelpers.validator(mapping);
  if (!valid) {
    expect(testHelpers.validator.errors).toBeNull();
  }
});

test("no valid hand in hands", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  delete mapping.gamepad.hands["neutral"];
  expect(testHelpers.validator(mapping)).toBe(false);
});

test("mismatched hands", () => {
  let mapping = testHelpers.getSmallestValidMapping();
  let hands = mapping.gamepad.hands;
  let hand = hands.neutral;

  hands["left"] = hand;
  expect(testHelpers.validator(mapping)).toBe(false);

  hands["right"] = hand;
  expect(testHelpers.validator(mapping)).toBe(false);

  delete hands["left"];
  expect(testHelpers.validator(mapping)).toBe(false);

  delete hands["neutral"];
  expect(testHelpers.validator(mapping)).toBe(false);

  delete hands["right"];
  hands["left"] = hand;
  expect(testHelpers.validator(mapping)).toBe(false);
})

test("extra invalid thing in hands", () => {
  const mapping = testHelpers.getSmallestValidMapping();

  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad.hands,
    "property": "randomThing",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);

  let hand = mapping.gamepad.hands["neutral"];
  mapping.gamepad.hands["randomThing"] = hand;
  expect(testHelpers.validator(mapping)).toBe(false);
});

test("invalid asset", () => {
  const mapping = testHelpers.getSmallestValidMapping();
  
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad.hands.neutral,
    "property": "asset",
    "expectedType": "string"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid root", () => {
  const mapping = testHelpers.getSmallestValidMapping();
  
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad.hands.neutral,
    "property": "root",
    "expectedType": "string"
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid components", () => {
  const mapping = testHelpers.getSmallestValidMapping();
  
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad.hands.neutral,
    "property": "components",
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid primaryButton", () => {
  const mapping = testHelpers.getSmallestValidMapping();
  
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad.hands.neutral,
    "property": "primaryButton",
    "expectedType": "number",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("invalid primaryAxes", () => {
  const mapping = testHelpers.getSmallestValidMapping();
  
  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad.hands.neutral,
    "property": "primaryAxes",
    "expectedType": "number",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});

test("extra invalid thing in neutral hand", () => {
  const mapping = testHelpers.getSmallestValidMapping();

  const checkPropertyOptions = {
    "mapping": mapping,
    "object": mapping.gamepad.hands.neutral,
    "property": "randomThing",
    "undefinedAllowed": true
  }
  testHelpers.checkProperty(checkPropertyOptions);
});
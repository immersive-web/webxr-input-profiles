const testHelpers = require("../testHelpers.js");
const validator = testHelpers.getValidator("visualResponses.schema.json");
const buttonVisualResponse = Object.freeze({
  "type": "onTouch",
  "target": "target node",
  "buttonMax": "buttonMax node"
});
const dpadVisualResponse = Object.freeze({
  "type": "onTouch",
  "target": "target node",
  "left": "left node",
  "right": "right node",
  "down": "down node",
  "up": "up node"
});
const axesVisualResponse = Object.freeze({
  "type": "onTouch",
  "target": "target node",
  "left": "left node",
  "right": "right node",
  "down": "down node",
  "up": "up node",
  "buttonMax": "buttonMax node"
});

test("Valid button visual response", () => {
  let valid = false;
  let visualResponse = Object.assign({}, buttonVisualResponse);
  
  valid = validator([visualResponse]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
  
  visualResponse.buttonMin = "buttonMin node";
  valid = validator([visualResponse]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test("Valid dpad visual response", () => {
  let valid = false;
  let visualResponse = Object.assign({}, dpadVisualResponse);
  
  valid = validator([visualResponse]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test("Valid axes visual response", () => {
  let valid = false;
  let visualResponse = Object.assign({}, axesVisualResponse);
  
  valid = validator([visualResponse]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
  
  visualResponse.buttonMin = "buttonMin node";
  valid = validator([visualResponse]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test("Valid onPress type", () => {
  let valid = false;
  let visualResponse = Object.assign({}, dpadVisualResponse);
  visualResponse.type = "onPress";
  
  valid = validator([visualResponse]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test("Invalid array length", () => {
  expect(validator([])).toBe(false);
});

test("Duplicates invalid", () => {
  expect(validator([buttonVisualResponse, buttonVisualResponse])).toBe(false);
});

test("Invalid type", () => {
  let visualResponse = Object.assign({}, buttonVisualResponse);
  
  delete visualResponse.type;
  expect(validator([visualResponse])).toBe(false);

  visualResponse.type = "some nonsense";
  expect(validator([visualResponse])).toBe(false);
});

test("Invalid target", () => {
  let visualResponse = Object.assign({}, buttonVisualResponse);
  
  delete visualResponse.target;
  expect(validator([visualResponse])).toBe(false);
});

test("Invalid buttonMin on dpad-style response", () => {
  let valid = false;
  let visualResponse = Object.assign({}, dpadVisualResponse);
  
  visualResponse.buttonMin = "buttonMin node";
  expect(validator([visualResponse])).toBe(false);
});

test("Invalid missing left node", () => {
  let valid = false;
  let visualResponse = Object.assign({}, dpadVisualResponse);
  
  delete visualResponse.left;
  expect(validator([visualResponse])).toBe(false);
});

test("Invalid missing right node", () => {
  let valid = false;
  let visualResponse = Object.assign({}, dpadVisualResponse);
  
  delete visualResponse.right;
  expect(validator([visualResponse])).toBe(false);
});

test("Invalid missing down node", () => {
  let valid = false;
  let visualResponse = Object.assign({}, dpadVisualResponse);
  
  delete visualResponse.down;
  expect(validator([visualResponse])).toBe(false);
});

test("Invalid missing up node", () => {
  let valid = false;
  let visualResponse = Object.assign({}, dpadVisualResponse);
  
  delete visualResponse.up;
  expect(validator([visualResponse])).toBe(false);
});

test("invalid additional properties", () => {
  let visualResponse = Object.assign({}, axesVisualResponse);
  visualResponse.someNonsense = {};
  expect(validator([visualResponse])).toBe(false);
});
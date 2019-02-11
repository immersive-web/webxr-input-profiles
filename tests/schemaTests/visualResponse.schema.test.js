const testHelpers = require("../testHelpers.js");
const validator = testHelpers.getValidator("visualResponses.schema.json");
const buttonVisualResponse = Object.freeze({
  "userAction": "onTouch",
  "target": "target node",
  "buttonMin": "buttonMin node",
  "buttonMax": "buttonMax node"
});
const dpadVisualResponse = Object.freeze({
  "userAction": "onTouch",
  "target": "target node",
  "left": "left node",
  "right": "right node",
  "bottom": "bottom node",
  "top": "top node"
});
const axesVisualResponse = Object.freeze({
  "userAction": "onTouch",
  "target": "target node",
  "left": "left node",
  "right": "right node",
  "bottom": "bottom node",
  "top": "top node",
  "buttonMin": "buttonMin node",
  "buttonMax": "buttonMax node"
});

test("Valid button visual response", () => {
  let valid = false;
  let visualResponse = Object.assign({}, buttonVisualResponse);
  
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
});

test("Valid onPress type", () => {
  let valid = false;
  let visualResponse = Object.assign({}, dpadVisualResponse);
  visualResponse.userAction = "onPress";
  
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
  
  delete visualResponse.userAction;
  expect(validator([visualResponse])).toBe(false);

  visualResponse.userAction = "some nonsense";
  expect(validator([visualResponse])).toBe(false);
});

test("Invalid target", () => {
  let visualResponse = Object.assign({}, buttonVisualResponse);
  delete visualResponse.target;
  expect(validator([visualResponse])).toBe(false);
});

test("Invalid buttonMin on dpad", () => {
  let visualResponse = Object.assign({}, dpadVisualResponse);
  visualResponse.buttonMin = "buttonMin node";
  expect(validator([visualResponse])).toBe(false);
});

test("Invalid buttonMax on dpad", () => {
  let visualResponse = Object.assign({}, dpadVisualResponse);
  visualResponse.buttonMax = "buttonMax node";
  expect(validator([visualResponse])).toBe(false);
});

test("Missing buttonMin on button", () => {
  let visualResponse = Object.assign({}, buttonVisualResponse);
  delete visualResponse.buttonMin;
  expect(validator([visualResponse])).toBe(false);
});

test("Missing buttonMax on button", () => {
  let visualResponse = Object.assign({}, buttonVisualResponse);
  delete visualResponse.buttonMax;
  expect(validator([visualResponse])).toBe(false);
});

test("Invalid missing left node", () => {
  let visualResponse = Object.assign({}, dpadVisualResponse);
  delete visualResponse.left;
  expect(validator([visualResponse])).toBe(false);
});

test("Invalid missing right node", () => {
  let visualResponse = Object.assign({}, dpadVisualResponse);
  delete visualResponse.right;
  expect(validator([visualResponse])).toBe(false);
});

test("Invalid missing bottom node", () => {
  let visualResponse = Object.assign({}, dpadVisualResponse);
  delete visualResponse.bottom;
  expect(validator([visualResponse])).toBe(false);
});

test("Invalid missing top node", () => {
  let visualResponse = Object.assign({}, dpadVisualResponse);
  delete visualResponse.top;
  expect(validator([visualResponse])).toBe(false);
});

test("invalid additional properties", () => {
  let visualResponse = Object.assign({}, axesVisualResponse);
  visualResponse.someNonsense = {};
  expect(validator([visualResponse])).toBe(false);
});
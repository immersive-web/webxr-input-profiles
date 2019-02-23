const TestHelpers = require("../testHelpers.js");
const validator = TestHelpers.getValidator("visualResponses.schema.json", ["visualResponse.properties.schema.json"]);

const visualResponse1DOF = Object.freeze({
  "degreesOfFreedom": 1,
  "button": "button node"
});

const visualResponse2DOF = Object.freeze({
  "degreesOfFreedom": 2,
  "left": "left node",
  "right": "right node",
  "bottom": "bottom node",
  "top": "top node"
});

const visualResponse3DOF = Object.freeze({
  "degreesOfFreedom": 3,
  "left": "left node",
  "right": "right node",
  "bottom": "bottom node",
  "top": "top node",
  "button": "button node"
});


const validVisualResponse = {
  "target": "TargetNode",
  "onPress": visualResponse3DOF
};

test("Valid 1DOF visual response", () => {
  let valid = false;

  let visualResponse = {
    "target": "TargetNode",
    "onPress": visualResponse1DOF
  };
  valid = validator([visualResponse]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  visualResponse.onTouch = visualResponse1DOF;
  valid = validator([visualResponse]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  delete visualResponse.onPress;
  valid = validator([visualResponse]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test("Valid 2DOF visual response", () => {
  let valid = false;

  let visualResponse = {
    "target": "TargetNode",
    "onPress": visualResponse2DOF
  };
  valid = validator([visualResponse]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  visualResponse.onTouch = visualResponse2DOF;
  valid = validator([visualResponse]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  delete visualResponse.onPress;
  valid = validator([visualResponse]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test("Valid 3DOF visual response", () => {
  let valid = false;

  let visualResponse = {
    "target": "TargetNode",
    "onPress": visualResponse3DOF
  };
  valid = validator([visualResponse]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  visualResponse.onTouch = visualResponse3DOF;
  valid = validator([visualResponse]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  delete visualResponse.onPress;
  valid = validator([visualResponse]);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test("Invalid array length", () => {
  expect(validator([])).toBe(false);
});

test("Duplicates invalid", () => {
  expect(validator([validVisualResponse, validVisualResponse])).toBe(false);
});

test("Invalid extra properties", () => {
  let visualResponse = TestHelpers.copyJsonObject(validVisualResponse);
  visualResponse.someNonsense = false;
  expect(validator([visualResponse])).toBe(false);
})

test("Missing target", () => {
  let visualResponse = TestHelpers.copyJsonObject(validVisualResponse);
  delete visualResponse.target;
  expect(validator([visualResponse])).toBe(false);
});

test("Missing actions", () => {
  let visualResponse = TestHelpers.copyJsonObject(validVisualResponse);
  delete visualResponse.onPress;
  expect(validator([visualResponse])).toBe(false);
});

let missingElements = [];
Object.keys(visualResponse1DOF).forEach(key => {
  missingElements.push([key, "1DOF", visualResponse1DOF]);
});
Object.keys(visualResponse2DOF).forEach(key => {
  missingElements.push([key, "2DOF", visualResponse2DOF]);
});
Object.keys(visualResponse3DOF).forEach(key => {
  missingElements.push([key, "3DOF", visualResponse3DOF]);
});

test.each(missingElements)("Missing %s on %s", (key, DOFtype, visualResponseDOF) => {
  let visualResponse = {
    "target": "TargetNode",
    "onPress": TestHelpers.copyJsonObject(visualResponseDOF)
  };
  delete visualResponse.onPress[key];
  expect(validator([visualResponse])).toBe(false);
});

test("1DOF invalid additional properties", () => {
  let visualResponse = {
    "target": "TargetNode",
    "onPress": TestHelpers.copyJsonObject(visualResponse1DOF)
  };
  visualResponse.onPress.someNonsense = {};
  expect(validator([visualResponse])).toBe(false);
});

test("2DOF invalid additional properties", () => {
  let visualResponse = {
    "target": "TargetNode",
    "onPress": TestHelpers.copyJsonObject(visualResponse2DOF)
  };
  visualResponse.onPress.someNonsense = {};
  expect(validator([visualResponse])).toBe(false);
});

test("3DOF invalid additional properties", () => {
  let visualResponse = {
    "target": "TargetNode",
    "onPress": TestHelpers.copyJsonObject(visualResponse3DOF)
  };
  visualResponse.onPress.someNonsense = {};
  expect(validator([visualResponse])).toBe(false);
});
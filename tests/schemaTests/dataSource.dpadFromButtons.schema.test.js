const testHelpers = require("../testHelpers.js");
const validator = testHelpers.getValidator("dataSource.dpadFromButtons.schema.json", ["dataSource.properties.schema.json"]);
const validDataSource = Object.freeze({
  "id": "a dpad from buttons",
  "dataSourceType": "dpadFromButtonsSource",
  "leftButtonIndex": 0,
  "rightButtonIndex": 1,
  "bottomButtonIndex": 2,
  "topButtonIndex": 3,
});

test("Valid dpadFromButton sources", () => {
  let valid = false;
  let dataSource = Object.assign({}, validDataSource);
  
  valid = validator(dataSource);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  dataSource.analogValues = true;
  valid = validator(dataSource);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test("No id", () => {
  let dataSource = Object.assign({}, validDataSource);
  delete dataSource.id;
  expect(validator(dataSource)).toBe(false);
});

test("Invalid dataSourceType", () => {
  let dataSource = Object.assign({}, validDataSource);
  
  delete dataSource.dataSourceType;
  expect(validator(dataSource)).toBe(false);
  
  dataSource.dataSourceType = "some nonsense";
  expect(validator(dataSource)).toBe(false);
});

test("Invalid leftButtonIndex", () => {
  let dataSource = Object.assign({}, validDataSource);
  
  delete dataSource.leftButtonIndex;
  expect(validator(dataSource)).toBe(false);
  
  dataSource.leftButtonIndex = -1;
  expect(validator(dataSource)).toBe(false);
});

test("Invalid rightButtonIndex", () => {
  let dataSource = Object.assign({}, validDataSource);
  
  delete dataSource.rightButtonIndex;
  expect(validator(dataSource)).toBe(false);
  
  dataSource.rightButtonIndex = -1;
  expect(validator(dataSource)).toBe(false);
});

test("Invalid bottomButtonIndex", () => {
  let dataSource = Object.assign({}, validDataSource);
  
  delete dataSource.bottomButtonIndex;
  expect(validator(dataSource)).toBe(false);
  
  dataSource.bottomButtonIndex = -1;
  expect(validator(dataSource)).toBe(false);
});

test("Invalid topButtonIndex", () => {
  let dataSource = Object.assign({}, validDataSource);
  
  delete dataSource.topButtonIndex;
  expect(validator(dataSource)).toBe(false);
  
  dataSource.topButtonIndex = -1;
  expect(validator(dataSource)).toBe(false);
});

test("invalid additional properties", () => {
  let dataSource = Object.assign({}, validDataSource);
  dataSource.someNonsense = {};
  expect(validator(dataSource)).toBe(false);
});
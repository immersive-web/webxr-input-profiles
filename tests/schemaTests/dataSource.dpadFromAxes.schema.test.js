const testHelpers = require("../testHelpers.js");
const validator = testHelpers.getValidator("dataSource.dpadFromAxes.schema.json", ["dataSource.properties.schema.json"]);
const validDataSource = Object.freeze({
  "id": "a dpad from axes",
  "dataSourceType": "dpadFromAxesSource",
  "xAxisIndex": 0,
  "yAxisIndex": 1
});

test("Valid dpad from axes sources", () => {
  let valid = false;
  let dataSource = Object.assign({}, validDataSource);
  
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

test("Invalid xAxisIndex", () => {
  let dataSource = Object.assign({}, validDataSource);
  
  dataSource.xAxisIndex = -1;
  expect(validator(dataSource)).toBe(false);
});

test("Invalid yAxisIndex", () => {
  let dataSource = Object.assign({}, validDataSource);
  
  dataSource.yAxisIndex = -1;
  expect(validator(dataSource)).toBe(false);
});

test("invalid additional properties", () => {
  let dataSource = Object.assign({}, validDataSource);
  dataSource.someNonsense = {};
  expect(validator(dataSource)).toBe(false);
});
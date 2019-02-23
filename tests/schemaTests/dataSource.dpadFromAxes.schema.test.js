const TestHelpers = require("../testHelpers.js");
const validator = TestHelpers.getValidator("dataSource.dpadFromAxes.schema.json", ["dataSource.properties.schema.json"]);
const validDataSource = Object.freeze({
  "id": "a dpad from axes",
  "dataSourceType": "dpadFromAxesSource",
  "xAxisIndex": 0,
  "yAxisIndex": 1
});

test("Valid dpad from axes sources", () => {
  let valid = false;
  let dataSource = TestHelpers.copyJsonObject(validDataSource);
  
  valid = validator(dataSource);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }
});

test("No id", () => {
  let dataSource = TestHelpers.copyJsonObject(validDataSource);
  delete dataSource.id;
  expect(validator(dataSource)).toBe(false);
});

test("Invalid dataSourceType", () => {
  let dataSource = TestHelpers.copyJsonObject(validDataSource);
  
  delete dataSource.dataSourceType;
  expect(validator(dataSource)).toBe(false);

  dataSource.dataSourceType = "some nonsense";
  expect(validator(dataSource)).toBe(false);
});

test("Invalid xAxisIndex", () => {
  let dataSource = TestHelpers.copyJsonObject(validDataSource);
  
  dataSource.xAxisIndex = -1;
  expect(validator(dataSource)).toBe(false);
});

test("Invalid yAxisIndex", () => {
  let dataSource = TestHelpers.copyJsonObject(validDataSource);
  
  dataSource.yAxisIndex = -1;
  expect(validator(dataSource)).toBe(false);
});

test("invalid additional properties", () => {
  let dataSource = TestHelpers.copyJsonObject(validDataSource);
  dataSource.someNonsense = {};
  expect(validator(dataSource)).toBe(false);
});
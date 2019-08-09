const validator = TestHelpers.getValidator('dataSource.button.schema.json', ['dataSource.properties.schema.json']);
const validDataSource = Object.freeze({
  id: 'a button',
  dataSourceType: 'buttonSource',
  buttonIndex: 0
});

test('Valid button sources', () => {
  let valid = false;
  const dataSource = TestHelpers.copyJsonObject(validDataSource);

  valid = validator(dataSource);
  if (!valid) {
    expect(validator.errors).toBeNull();
  }

  dataSource.pressUnsupported = true;
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

test('No id', () => {
  const dataSource = TestHelpers.copyJsonObject(validDataSource);
  delete dataSource.id;
  expect(validator(dataSource)).toBe(false);
});

test('Invalid dataSourceType', () => {
  const dataSource = TestHelpers.copyJsonObject(validDataSource);

  delete dataSource.dataSourceType;
  expect(validator(dataSource)).toBe(false);

  dataSource.dataSourceType = 'some nonsense';
  expect(validator(dataSource)).toBe(false);
});

test('Invalid buttonIndex', () => {
  const dataSource = TestHelpers.copyJsonObject(validDataSource);

  delete dataSource.buttonIndex;
  expect(validator(dataSource)).toBe(false);

  dataSource.buttonIndex = -1;
  expect(validator(dataSource)).toBe(false);
});

test('invalid additional properties', () => {
  const dataSource = TestHelpers.copyJsonObject(validDataSource);
  dataSource.someNonsense = {};
  expect(validator(dataSource)).toBe(false);
});

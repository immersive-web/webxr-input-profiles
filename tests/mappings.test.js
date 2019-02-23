const TestHelpers = require("./testHelpers.js");
const validator = TestHelpers.getValidator();
const Constants = require("../src/constants.js");

const mappingList = TestHelpers.getMappingsList();

describe.each(mappingList)("validateMapping.%s", (gamepadId) => {
  const mapping = TestHelpers.getMappingById(gamepadId);

  test("Mapping exists and passes schema validation", () => {
    expect(mapping).not.toBeNull();
    let valid = validator(mapping);
    if (!valid) {
      expect(validator.errors).toBeNull();
    }
  });

  test("Mapping has unique data source ids", () => {
    let dataSourceIds = {};
    mapping.dataSources.forEach((dataSource) => {
      expect(dataSourceIds[dataSource.id]).toBeUndefined();
      dataSourceIds[dataSource.id] = true;
    });
  });

  test("Each hand has unique dataSources", () => {
    Object.values(mapping.hands).forEach((hand) => {
      let dataSourceIndices = {};
      hand.components.forEach((componentIndex) => {
        let component = mapping.components[componentIndex];
        expect(dataSourceIndices[component.dataSource]).toBeUndefined();
        dataSourceIndices[component.dataSource] = true;
      });
    });
  });

  test("Component references are valid", () => {
    mapping.components.forEach((component) => {
      expect(component.dataSource).toBeLessThan(mapping.dataSources.length);
      component.visualResponses.forEach((visualResponse) => {
        expect(visualResponse).toBeLessThan(mapping.visualResponses.length);
      });
    });
  });

  test("Hand references are valid", () => {
    Object.values(mapping.hands).forEach((hand) => {
      hand.components.forEach((component) => {
        expect(component).toBeLessThan(mapping.components.length);
      });

      if (hand.primaryButtonComponent) {
        expect(hand.primaryButtonComponent).toBeLessThan(mapping.components.length);
        let component = mapping.components[hand.primaryButtonComponent];
        let dataSource = mapping.dataSources[component.dataSource];
        expect(dataSource.dataSourceType).toBe("buttonSource");
      }
      
      if (hand.primaryAxesComponent) {
        expect(hand.primaryAxesComponent).toBeLessThan(mapping.components.length);
        let component = mapping.components[hand.primaryAxesComponent];
        let dataSource = mapping.dataSources[component.dataSource];
        expect(dataSource.dataSourceType).toMatch(/thumbstickSource|touchpadSource/);
      }
    })
  });

  test("Visualizations are of a valid type for the dataSource", () => {
    // Iterate through all components and confirm the visualResponses are
    // valid for the dataSourceType
    Object.values(mapping.components).forEach((component) => {
      let dataSource = mapping.dataSources[component.dataSource];

      component.visualResponses.forEach((visualResponseIndex) => {
        let visualResponse = mapping.visualResponses[visualResponseIndex];

        // Helper function to confirm visualResponse degreesOfFreedom
        // is valid for the dataSourceType
        const validateDegreesOfFreedom = (degreesOfFreedom) => {
          switch(dataSource.dataSourceType) {
            case Constants.DataSourceType.BUTTON:
              expect(degreesOfFreedom).toEqual(1);
              break;
            case Constants.DataSourceType.DPAD_FROM_AXES:
            case Constants.DataSourceType.DPAD_FROM_BUTTONS:
              expect(degreesOfFreedom).toEqual(2);
              break;
            case Constants.DataSourceType.THUMBSTICK:
            case Constants.DataSourceType.TOUCHPAD:
              if (dataSource.buttonIndex != undefined) {
                expect(degreesOfFreedom).toBeGreaterThanOrEqual(1);
                expect(degreesOfFreedom).toBeLessThanOrEqual(3);
              } else {
                expect(degreesOfFreedom).toEqual(2);
              }
              break;
            default:
              throw new Error(`Unknown ${dataSource.dataSourceType}`);
          }
        };

        if (visualResponse.onPress) {
          validateDegreesOfFreedom(visualResponse.onPress.degreesOfFreedom);
        }

        if (visualResponse.onTouch) {
          validateDegreesOfFreedom(visualResponse.onTouch.degreesOfFreedom);
        }
      });
    });
  });

  test("No unused data sources", () => {
    let usedDataSourceIndices = Array(mapping.dataSources.length);
    mapping.components.forEach((component) => {
      usedDataSourceIndices[component.dataSource] = true;
    });

    let unusedDataSources = mapping.dataSources.filter((dataSource, index) => !usedDataSourceIndices[index]);
    expect(unusedDataSources).toHaveLength(0);
  });

  test("No unused components", () => {
    let usedComponentIndices = Array(mapping.components.length);

    Object.values(mapping.hands).forEach((hand) => {
      hand.components.forEach((componentIndex) => {
        usedComponentIndices[componentIndex] = true;
      });
    });

    let unusedComponents = mapping.components.filter((component, index) => !usedComponentIndices[index]);
    expect(unusedComponents).toHaveLength(0);
  });

  test("No unused visualResponses", () => {
    let usedVisualResponseIndicies = Array(mapping.visualResponses.length);

    mapping.components.forEach((component) => {
      component.visualResponses.forEach((visualResponseIndex) => {
        usedVisualResponseIndicies[visualResponseIndex] = true;
      });
    });

    let unusedVisualResponses = mapping.visualResponses.filter((visualResponse, index) => !usedVisualResponseIndicies[index]);
    expect(unusedVisualResponses).toHaveLength(0);
  });

});
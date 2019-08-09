const { join } = require('path');
const fs = require('fs-extra');

const validator = TestHelpers.getValidator();
const profilesList = TestHelpers.getSupportedProfilesList();

describe.each(profilesList)('Validate %s profile', (profileName) => {
  const profile = TestHelpers.getProfile(profileName);

  test('Mapping exists and passes schema validation', () => {
    expect(profile).not.toBeNull();
    const valid = validator(profile);
    if (!valid) {
      expect(validator.errors).toBeNull();
    }
  });

  test('Matched schema and package version', () => {
    const { version } = fs.readJSONSync(join(__dirname, '../../../package.json'));
    const schemaVersion = version.replace(/\.[0-9]+$/, '');
    expect(profile.version).toEqual(schemaVersion);
  });

  test('Mapping has unique data source ids', () => {
    const dataSourceIds = {};
    profile.dataSources.forEach((dataSource) => {
      expect(dataSourceIds[dataSource.id]).toBeUndefined();
      dataSourceIds[dataSource.id] = true;
    });
  });

  test('Each hand has unique dataSources', () => {
    Object.values(profile.handedness).forEach((hand) => {
      const dataSourceIndices = {};
      hand.components.forEach((componentIndex) => {
        const component = profile.components[componentIndex];
        expect(dataSourceIndices[component.dataSource]).toBeUndefined();
        dataSourceIndices[component.dataSource] = true;
      });
    });
  });

  test('Component references are valid', () => {
    profile.components.forEach((component) => {
      expect(component.dataSource).toBeLessThan(profile.dataSources.length);
      if (component.visualResponses) {
        component.visualResponses.forEach((visualResponse) => {
          expect(visualResponse).toBeLessThan(profile.visualResponses.length);
        });
      }
    });
  });

  test('Hand references are valid', () => {
    Object.values(profile.handedness).forEach((hand) => {
      hand.components.forEach((component) => {
        expect(component).toBeLessThan(profile.components.length);
      });

      expect(hand.selectionComponent).toBeLessThan(profile.components.length);
      const component = profile.components[hand.selectionComponent];
      const dataSource = profile.dataSources[component.dataSource];
      expect(dataSource.buttonIndex).toBeDefined();
    });
  });

  test('No unused data sources', () => {
    const usedDataSourceIndices = Array(profile.dataSources.length);
    profile.components.forEach((component) => {
      usedDataSourceIndices[component.dataSource] = true;
    });

    const unusedDataSources = profile.dataSources.filter(
      (dataSource, index) => !usedDataSourceIndices[index]
    );
    expect(unusedDataSources).toHaveLength(0);
  });

  test('No unused components', () => {
    const usedComponentIndices = Array(profile.components.length);

    Object.values(profile.handedness).forEach((hand) => {
      hand.components.forEach((componentIndex) => {
        usedComponentIndices[componentIndex] = true;
      });
    });

    const unusedComponents = profile.components.filter(
      (component, index) => !usedComponentIndices[index]
    );
    expect(unusedComponents).toHaveLength(0);
  });

  test('No unused visualResponses', () => {
    if (profile.visualResponses) {
      const usedVisualResponseIndicies = Array(profile.visualResponses.length);

      profile.components.forEach((component) => {
        component.visualResponses.forEach((visualResponseIndex) => {
          usedVisualResponseIndicies[visualResponseIndex] = true;
        });
      });

      const unusedVisualResponses = profile.visualResponses.filter(
        (visualResponse, index) => !usedVisualResponseIndicies[index]
      );
      expect(unusedVisualResponses).toHaveLength(0);
    }
  });

  test('WebVR properties', () => {
    const isWebVR = profileName.startsWith('WebVR ');

    if (isWebVR) {
      expect(profile.webVR).toEqual(true);

      Object.values(profile.handedness).forEach((hand) => {
        expect(hand.webVR_targetRayOrigin).toBeDefined();
      });
    } else {
      expect(profile.webVR).toBeUndefined();

      Object.values(profile.handedness).forEach((hand) => {
        expect(hand.webVR_targetRayOrigin).toBeUndefined();
      });

      Object.values(profile.dataSources).forEach((dataSource) => {
        expect(dataSource.webVR_xAxisInverted).toBeUndefined();
        expect(dataSource.webVR_yAxisInverted).toBeUndefined();
      });
    }
  });
});

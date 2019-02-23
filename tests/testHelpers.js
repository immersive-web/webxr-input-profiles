const { join } = require('path');
const mappingsFolder = join(__dirname, "../mappings/");
const mockMappingsFolder = join(__dirname, "./mockMappings/");
const Constants = require("../src/constants.js");

const TestHelpers = {
  /**
   * @description Gets the list of mapping files in the known folder locations
   * @param {boolean} useMocks Indicates the folder with mock mappings should
   * be used instead of the real mappings folder
   * @returns {Array} The list of Gamepad id's which have known mappings
   */
  getMappingsList : function (useMocks) {
    const { lstatSync, readdirSync } = require('fs')
  
    const getSubDirectoryList = function(folder) {
      return readdirSync(folder).filter(item => lstatSync(join(folder, item)).isDirectory());
    };

    let folder = useMocks ? mockMappingsFolder : mappingsFolder;
    const items = getSubDirectoryList(folder);
    return items;
  },

  /**
   * @description Gets the mapping description for the supplied gamepad id
   * @param {String} gamepadId The id of the Gamepad to find the mapping for
   * @param {boolean} useMocks Indicates the folder with mock mappings should
   * be searched instead of the real mappings folder
   * @returns {Object} The mapping described in the mapping.json file
   */
  getMappingById : function (gamepadId, useMocks) {
    let folder = useMocks ? mockMappingsFolder : mappingsFolder;
    let mappingPath = join(folder, gamepadId, "mapping.json")
    let mapping = require(mappingPath);
    return mapping;
  },

  /**
   * @description Gets a schema validator for the schema file described by
   * the schema parameter.  If no schema parameter is supplied, the top-level
   * mapping schema is used
   * @param {String} [schema] - The filename of the schema to use for
   * validation
   * @param {String[]} [dependencies] - The list of filenames that the schema
   * parameter is dependent on
   * @returns {Object} An AJV validator that can be used to validate mappings
   */
  getValidator: function (schemaFilename, dependencies) {
    const { join } = require('path');
    const schemasFolder = join(__dirname, "../schemas/");
    const Ajv = require('ajv');
    const ajv = new Ajv();

    let mainSchema;

    if (schemaFilename) {
      if (dependencies) {
        dependencies.forEach((dependency) => {
          ajv.addMetaSchema(require(join(schemasFolder, dependency)));
        })
      }
      mainSchema = require(join(schemasFolder, schemaFilename));
    } else {
      const mainSchemaId = "https://immersive-web/gamepad-mapping/0.1.0/mapping.schema.json";
      const fs = require("fs");
      const items = fs.readdirSync(schemasFolder);
      items.forEach( (filename) => {
        const schema = require(join(schemasFolder, filename));
        if (schema.$id == mainSchemaId) {
          mainSchema = schema;
        } else {
          ajv.addMetaSchema(schema);
        }
      });
    } 

    validator =  ajv.compile(mainSchema);
    return validator;
  },

  /**
   * @description Builds a data object with a single button and a valid state 
   * property, as defined by ComponentState in constants.js
   * @param {Object} [componentValues={}] - The values to be filled into the 
   * data object
   * @param {number} [componentValues.button=0] - The button's value to be 
   * filled in
   * @returns {Object} The data object
   */
  makeData1DOF: function ({button: value=0}={}) {
    let data = {
      state: Constants.ComponentState.DEFAULT,
      buttons: { 
        button: { 
          value: value,
          pressed: (value == 1),
          touched: (value > 0)
        } 
      }
    }
    
    if (data.buttons.button.pressed) {
      data.state = Constants.ComponentState.PRESSED;
    } else if (data.buttons.button.touched) {
      data.state = Constants.ComponentState.TOUCHED;
    }

    return data;
  },

  /**
   * @description Builds a data object with an xAxis and a yAxis and a valid
   * state property, as defined by ComponentState in constants.js
   * @param {Object} [componentValues={}] - The values to be filled into the 
   * data object
   * @param {number} [componentValues.xAxis=0] - The xAxis value to be filled in
   * @param {number} [componentValues.yAxis=0] - The yAxis value to be filled in
   * @returns {Object} The data object
   */
  makeData2DOFAxes: function({xAxis=0, yAxis=0}={}) {
    let data = {
      state: Constants.ComponentState.DEFAULT,
      axes: {
        xAxis: xAxis,
        yAxis: yAxis
      }
    }

    if (Math.abs(xAxis) > Constants.PressThreshold || 
        Math.abs(yAxis) > Constants.PressThreshold) {
      data.state = Constants.ComponentState.PRESSED;
    } else if (Math.abs(xAxis) > Constants.TouchThreshold || 
               Math.abs(yAxis) > Constants.TouchThreshold) {
      data.state = Constants.ComponentState.TOUCHED;
    }

    return data;
  },

  /**
   * @description Builds a data object with a left, right, top, and bottom 
   * buttons and a valid state property, as defined by ComponentState in 
   * constants.js
   * @param {Object} [componentValues={}] - The values to be filled into the 
   * data object
   * @param {number} [componentValues.left=0] - The left button value to be 
   * filled in
   * @param {number} [componentValues.right=0] - The right button value to be 
   * filled in
   * @param {number} [componentValues.top=0] - The top button value to be 
   * filled in
   * @param {number} [componentValues.bottom=0] - The bottom button value to be
   * filled in
   * @returns {Object} The data object
   */
  makeData2DOFButtons: function({left=0, right=0, top=0, bottom=0}={}) {
    let data = {
      state: Constants.ComponentState.DEFAULT,
      buttons: { 
        left: { 
          value: left,
          pressed: (left == 1),
          touched: (left > 0)
        },
        right: { 
          value: right,
          pressed: (right == 1),
          touched: (right > 0)
        },
        top: { 
          value: top,
          pressed: (top == 1),
          touched: (top > 0)
        },
        bottom: { 
          value: bottom,
          pressed: (bottom == 1),
          touched: (bottom > 0)
        } 
      }
    };

    Object.values(data.buttons).forEach( (button) => {
      if (data.state == Constants.ComponentState.PRESSED || button.pressed) {
        data.state = Constants.ComponentState.PRESSED;
      } else if (data.state == Constants.ComponentState.TOUCHED || button.touched) {
        data.state = Constants.ComponentState.TOUCHED;
      }
    });

    return data;
  },

  /**
   * @description Builds a data object with an xAxis, yAxis, and a button
   * along with a valid state property, as defined by ComponentState in 
   * constants.js
   * @param {Object} [componentValues={}] - The values to be filled into the 
   * data object
   * @param {number} [componentValues.xAxis=0] - The xAxis value to be filled in
   * @param {number} [componentValues.yAxis=0] - The yAxis value to be filled in
   * @param {number} [componentValues.button=0] - The button's value to be 
   * filled in
   * @returns {Object} The data object
   */
  makeData3DOFAxes: function({xAxis=0, yAxis=0, button=0}={}) {
    let data = {
      state: Constants.ComponentState.DEFAULT,
      axes: {
        xAxis: xAxis,
        yAxis: yAxis
      },   
      buttons: { 
        button: { 
          value: button,
          pressed: (button == 1),
          touched: (button > 0)
        }
      }
    }
  
    if (data.buttons.button.pressed) {
      data.state = Constants.ComponentState.PRESSED;
    } else if (data.buttons.button.touched || Math.abs(xAxis) > Constants.TouchThreshold || Math.abs(yAxis) > Constants.TouchThreshold) {
      data.state = Constants.ComponentState.TOUCHED;
    }

    return data;
  },

  /**
   * @description Builds a data object with left, right, top, bottom, and 
   * center buttons along with a valid state property, as defined by 
   * ComponentState in constants.js
   * @param {Object} [componentValues={}] - The values to be filled into the 
   * data object
   * @param {number} [componentValues.left=0] - The left button value to be 
   * filled in
   * @param {number} [componentValues.right=0] - The right button value to be 
   * filled in
   * @param {number} [componentValues.top=0] - The top button value to be 
   * filled in
   * @param {number} [componentValues.bottom=0] - The bottom button value to be
   * filled in
   * @param {number} [componentValues.button=0] - The center button's value to
   * be filled in
   * @returns {Object} The data object
   */
  makeData3DOFButtons: function({left=0, right=0, top=0, bottom=0, button=0}={}) {
    let data = {
      state: Constants.ComponentState.DEFAULT,
      buttons: { 
        button: { 
          value: button,
          pressed: (button == 1),
          touched: (button > 0)
        },
        left: { 
          value: left,
          pressed: false,
          touched: (left > 0)
        },
        right: { 
          value: right,
          pressed: false,
          touched: (right > 0)
        },
        top: { 
          value: top,
          pressed: false,
          touched: (top > 0)
        },
        bottom: { 
          value: bottom,
          pressed: false,
          touched: (bottom > 0)
        } 
      }
    }

    if (data.buttons.button.pressed) {
      data.state = Constants.ComponentState.PRESSED;
    } else {
      Object.values(data.buttons).forEach((button) => {
        if (button.touched) {
          data.state = Constants.ComponentState.TOUCHED;
        }
      });
    }

    return data;
  },

  /**
   * @description Builds a data object based on the supplied dataSource along 
   * with a valid state property, as defined by ComponentState in constants.js
   * @param {Object} dataSource - The data source for which a data object is
   * to be created
   * @param {Object} [componentValues={}] - The values to be filled into the 
   * data object
   * @param {boolean} [asButtons] - Indicates the data object should represent
   * axes as buttons
   * @returns {Object} The data object
   */
  makeData: function(dataSource, componentValues={}, asButtons) {
    let partsCount = Object.keys(dataSource).filter((key) => key.endsWith("Index")).length;

    let data;
    switch(partsCount) {
      case 1:
        data = TestHelpers.makeData1DOF(componentValues);
        break;
      case 2:
        if (asButtons) {
          data = TestHelpers.makeData2DOFButtons(componentValues);
        } else {
          data = TestHelpers.makeData2DOFAxes(componentValues);
        }
        break;
      case 3:
        if (asButtons) {
          data = TestHelpers.makeData3DOFButtons(componentValues);
        } else {
          data = TestHelpers.makeData3DOFAxes(componentValues);
        }
        break;
      case 4:
        data = TestHelpers.makeData2DOFButtons(componentValues);
        break;
      default:
        throw new Error(`Cannot make data for parts count = ${partsCount}`);
    }

    return data;
  },

  /**
   * @description Makes a deep copy of JSON-compatible objects
   * @param {Object} objectToCopy - The object to copy
   * @returns {Object} A copy of the object
   */
  copyJsonObject: function (objectToCopy) {
    return JSON.parse(JSON.stringify(objectToCopy));
  }

};

module.exports = TestHelpers;
const { join } = require('path');
const mappingsFolder = join(__dirname, "../mappings/");
const mockMappingsFolder = join(__dirname, "./mockMappings/");
const Constants = require("../src/constants.js");

const TestHelpers = {
  getMappingsList : function (useMocks) {
    const { lstatSync, readdirSync } = require('fs')
  
    const getSubDirectoryList = function(folder) {
      return readdirSync(folder).filter(item => lstatSync(join(folder, item)).isDirectory());
    };

    let folder = useMocks ? mockMappingsFolder : mappingsFolder;
    const items = getSubDirectoryList(folder);
    return items;
  },

  getMappingById : function (gamepadId, useMocks) {
    let folder = useMocks ? mockMappingsFolder : mappingsFolder;
    let mappingPath = join(folder, gamepadId, "mapping.json")
    let mapping = require(mappingPath);
    return mapping;
  },

  getValidator: function (schema, dependencies) {
    const { join } = require('path');
    const schemasFolder = join(__dirname, "../schemas/");
    const Ajv = require('ajv');
    const ajv = new Ajv();

    let validator;

    if (schema) {
      if (dependencies) {
        dependencies.forEach((dependency) => {
          ajv.addMetaSchema(require(join(schemasFolder, dependency)));
        })
      }
      validator = ajv.compile(require(join(schemasFolder, schema)));
    } else {
      const mainSchemaId = "https://immersive-web/gamepad-mapping/0.1.0/mapping.schema.json";
      let mainSchema;
      const fs = require("fs");
      const items = fs.readdirSync(schemasFolder);
      items.forEach( (filename) => {
        const schemaPath = schemasFolder + filename;
        const schema = require(schemaPath);
        if (schema.$id == mainSchemaId) {
          mainSchema = schema;
        } else {
          ajv.addMetaSchema(schema);
        }
      });
      validator =  ajv.compile(mainSchema);
    } 

    return validator;
  },

  makeData1DOF: function ({button=0}={}) {
    let data = {
      state: Constants.ComponentState.DEFAULT,
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
    } else if (data.buttons.button.touched) {
      data.state = Constants.ComponentState.TOUCHED;
    }

    return data;
  },

  makeData2DOFAxes: function({xAxis=0, yAxis=0}={}) {
    let data = {
      state: Constants.ComponentState.DEFAULT,
      axes: {
        xAxis: xAxis,
        yAxis: yAxis
      }
    }

    if (Math.abs(xAxis) > Constants.PressThreshold || Math.abs(yAxis) > Constants.PressThreshold) {
      data.state = Constants.ComponentState.PRESSED;
    } else if (Math.abs(xAxis) > Constants.TouchThreshold || Math.abs(yAxis) > Constants.TouchThreshold) {
      data.state = Constants.ComponentState.TOUCHED;
    }

    return data;
  },

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

  makeData: function(partsCount, parameters={}) {
    let data;
    switch(partsCount) {
      case 1:
        data = TestHelpers.makeData1DOF(parameters);
        break;
      case 2:
        data = TestHelpers.makeData2DOFAxes(parameters);
        break;
      case 3:
        data = TestHelpers.makeData3DOFAxes(parameters);
        break;
      case 4:
        data = TestHelpers.makeData2DOFButtons(parameters);
        break;
      case 5:
        data = TestHelpers.makeData3DOFButtons(parameters);
        break;
      default:
        throw new Error(`Cannot make data for parts count = ${partsCount}`);
    }

    return data;
  }

};

module.exports = TestHelpers;
const TypeEnum = Object.freeze({"buttonOnly":1, "axesOnly":2, "buttonAndAxes":3 });

class ResponseMapping {
  constructor(mappingDescription, responseIndex) {
    this.responseDescription = mappingDescription.gamepad.responses[responseIndex];

    // TODO fill in 
  }
  
  apply(dataSourceValues) {
    switch(this.type) {
      case "buttonAndAxes":
        break;
      case "axesOnly":
        break;
      case "buttonOnly":
        break;
    }
  }
};

module.exports = ResponseMapping;
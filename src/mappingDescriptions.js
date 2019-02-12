const { join } = require('path');
const mappingsFolder = join(__dirname, "../mappings/");

var mappingDescriptions = {

  getList : function () {
    const { lstatSync, readdirSync } = require('fs')
  
    const getSubDirectoryList = function(folder) {
      return readdirSync(folder).filter(item => lstatSync(join(folder, item)).isDirectory());
    };

    const items = getSubDirectoryList(mappingsFolder);
    return items;
  },
  
  getMappingById : function (gamepadId) {
    let mappingPath = join(mappingsFolder, gamepadId, "mapping.json")
    let mapping = require(mappingPath);
    return mapping;
  }
};

module.exports = mappingDescriptions;
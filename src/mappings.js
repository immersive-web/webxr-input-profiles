const Mappings = {
  /**
   * @description Gets the mapping description for the supplied gamepad id
   * @param {String} gamepadId The id of the Gamepad to find the mapping for
   * @param {string} mappingType Indicates the folder from which
   * mapping should be enumerated
   * @returns {Object} The mapping file JSON text as an object
   */
  getMapping: function (baseUri, gamepadId, mappingType) {
    const mappingUri = `${baseUri}/mappings/${mappingType}/${gamepadId}/mapping.json`;
    const promise = fetch(mappingUri)
      .then( (response) => {
        if (response.ok) {
          return response.json();
        } else {
          return Promise.reject({
            status: response.status,
            statusText: response.statusText
          });
        }
      });
    return promise;
  }
};

export { Mappings };
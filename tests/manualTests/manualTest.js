import { Constants, Mappings } from '../../dist/xr-gamepad-mappings.module.js';
import { MockGamepad } from '../../dist/mock-gamepad.module.js';
const gamepadId = "mock1";
const mappingType = Constants.MappingType.MOCK;
var mockMapping;
var mockGamepad;

window.addEventListener("load", onLoad);
function onLoad() {
    const dataElement = document.getElementById("data");
    Mappings.getMapping('../../dist/', gamepadId, mappingType).then( (mapping) => {
        mockMapping = mapping;
        mockGamepad = new MockGamepad(mockMapping, Constants.Handedness.NONE);
        dataElement.innerText = JSON.stringify(mockGamepad.getValues('a button'));
    })
}
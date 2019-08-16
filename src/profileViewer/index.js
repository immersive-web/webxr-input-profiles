import RepositorySelector from './repositorySelector.js';
import LocalProfileSelector from './localProfileSelector.js';
import ModelViewer from './modelViewer.js';
import ManualControls from './manualControls.js';
import ErrorLogging from './errorLogging.js';

const selectorIdStorageKey = 'selectorId';
const selectors = {};
let activeSelector;

/**
 * Updates the controls and model viewer when the selected motion controller changes
 * @param {Object} event
 */
function onMotionControllerChange(event) {
  if (event.target === activeSelector.element) {
    ErrorLogging.clearAll();
    if (!event.detail) {
      ModelViewer.clear();
      ManualControls.clear();
    } else {
      const motionController = event.detail;
      ManualControls.build(motionController);
      ModelViewer.loadModel(motionController);
    }
  }
}

/**
 * Handles the selection source radio button change
 */
function onRadioChange() {
  ManualControls.clear();
  ModelViewer.clear();

  // Figure out which item is now selected
  const selectedQuery = 'input[name = "sourceSelector"]:checked';
  const selectorType = document.querySelector(selectedQuery).value;

  // Disable the previous selection source
  if (activeSelector) {
    activeSelector.disable();
  }

  // Start using the new selection source
  activeSelector = selectors[selectorType];
  activeSelector.enable();
  window.localStorage.setItem(selectorIdStorageKey, selectorType);
}

function onLoad() {
  ModelViewer.initialize();

  // Hook up event listeners to the radio buttons
  const repositoryRadioButton = document.getElementById('repositoryRadioButton');
  const localProfileRadioButton = document.getElementById('localProfileRadioButton');
  repositoryRadioButton.addEventListener('change', onRadioChange);
  localProfileRadioButton.addEventListener('change', onRadioChange);

  // Check if the page has stored a choice of selection source
  const storedSelectorId = window.localStorage.getItem(selectorIdStorageKey);
  const radioButtonToSelect = document.querySelector(`input[value = "${storedSelectorId}"]`);
  if (radioButtonToSelect) {
    radioButtonToSelect.checked = true;
  }

  // Create the objects to select motion controllers based on user input
  selectors.repository = new RepositorySelector();
  selectors.localProfile = new LocalProfileSelector();
  Object.values(selectors).forEach((selector) => {
    selector.element.addEventListener('motionControllerChange', onMotionControllerChange);
  });

  // manually trigger first check
  onRadioChange();
}
window.addEventListener('load', onLoad);

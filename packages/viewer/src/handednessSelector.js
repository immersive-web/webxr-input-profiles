import ErrorLogging from './errorLogging.js';

/**
 * Adds a selector for choosing the handedness of the provided profile
 */
class HandednessSelector {
  constructor(parentSelectorType) {
    this.selectorType = parentSelectorType;

    // Create the handedness selector and watch for changes
    this.element = document.createElement('select');
    this.element.id = `${this.selectorType}HandednessSelector`;
    this.element.addEventListener('change', () => { this.onHandednessSelected(); });

    this.clearSelectedProfile();
  }

  /**
   * Fires an event notifying that the handedness has changed
   */
  fireHandednessChange() {
    const changeEvent = new CustomEvent('handednessChange', { detail: this.handedness });
    this.element.dispatchEvent(changeEvent);
  }

  clearSelectedProfile() {
    this.selectedProfile = null;
    this.handedness = null;
    this.handednessStorageKey = null;
    this.element.disabled = true;
    this.element.innerHTML = '<option value="loading">Loading...</option>';
    this.fireHandednessChange();
  }

  /**
   * Responds to changes in the dropdown, saves the value to local storage, and triggers the event
   */
  onHandednessSelected() {
    // Create a mock gamepad that matches the profile and handedness
    this.handedness = this.element.value;
    window.localStorage.setItem(this.handednessStorageKey, this.handedness);
    this.fireHandednessChange();
  }

  /**
   * Sets the profile from which handedness needs to be selected
   * @param {object} profile
   */
  setSelectedProfile(profile) {
    this.clearSelectedProfile();
    this.selectedProfile = profile;

    // Load and clear the last selection for this profile id
    this.handednessStorageKey = `${this.selectorType}_${this.selectedProfile.id}_handedness`;
    const storedHandedness = window.localStorage.getItem(this.handednessStorageKey);
    window.localStorage.removeItem(this.handednessStorageKey);

    // Populate handedness selector
    this.element.innerHTML = '';
    Object.keys(this.selectedProfile.layouts).forEach((handedness) => {
      this.element.innerHTML += `
        <option value='${handedness}'>${handedness}</option>
      `;
    });

    if (this.element.children.length === 0) {
      ErrorLogging.log(`No handedness values found for profile ${this.selectedProfile.id}`);
    }

    // Apply stored handedness if found
    if (storedHandedness && this.selectedProfile.layouts[storedHandedness]) {
      this.element.value = storedHandedness;
    }

    // Manually trigger the handedness to change
    this.element.disabled = false;
    this.onHandednessSelected();
  }
}

export default HandednessSelector;

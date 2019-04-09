/**
 * @description Represents a mock button on a MockGamepad
 * @author Nell Waliczek / https://github.com/NellWaliczek
 */
class MockGamepadButton {
  constructor() {
    this.reset();
  }

  /**
   * @description Reinitializes all properties to their default values
   */
  reset() {
    this.pressed = false;
    this.touched = false;
    this.value = 0;
  }

  /**
   * @description Sets new values on the mock button
   * @param {Object} buttonValues - The values to set on the button; a number 
   * @param {number} buttonValues.value - A value in the range of [0-1]
   * @param {boolean} buttonValues.touched - Indicates if the button is touched;
   * cannot be false if the button's value is greater than 1 or if the button
   * is pressed
   * @param {boolean} buttonValues.pressed - Indicates if the button is pressed;
   * cannot be true if the button's value does not equal 1
   */
  setValues({value = this.value, touched = this.touched, pressed = this.pressed, allowInvalid}) {
    if (!allowInvalid) {
      if (value < 0 || value > 1) {
        throw new Error(`Value ${value} is outside the valid range for a button`);
      }

      if (!touched && value > 0) {
        throw new Error(`Cannot set touched to false when value is greater than zero`);
      }

      if (pressed) {
        if (!touched) {
          throw new Error(`Cannot set pressed to true when touched is false`);
        }

        if (value < 1) {
          throw new Error("Cannot set pressed to true when value does not equal 1")
        }
      }
    }
    
    this.pressed = pressed;
    this.touched = touched;
    this.value = value;
  }

  /**
   * @description Gets a copy of the mock button's current values
   * @returns {Object} A copy of the mock button's current values
   */
  getValues() {
    return {
      pressed: this.pressed,
      touched: this.touched,
      value: this.value
    };
  }
};

export { MockGamepadButton };
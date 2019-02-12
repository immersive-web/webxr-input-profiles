class MockGamepadButton {
  constructor() {
    this.reset();
  }

  reset() {
    this.pressed = false;
    this.touched = false;
    this.value = 0;
  }

  setValues(values) {
    this.pressed = values.pressed || this.pressed;
    this.touched = values.touched || this.touched;
    this.value = (values.value == undefined) ? this.value : values.value;
  }

  getValues() {
    return {
      pressed: this.pressed,
      touched: this.touched,
      value: this.value
    };
  }
};

module.exports = MockGamepadButton;
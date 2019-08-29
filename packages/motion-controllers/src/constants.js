const Constants = {
  Handedness: Object.freeze({
    NONE: 'none',
    LEFT: 'left',
    RIGHT: 'right'
  }),

  ComponentState: Object.freeze({
    DEFAULT: 'default',
    TOUCHED: 'touched',
    PRESSED: 'pressed'
  }),

  ComponentType: Object.freeze({
    TRIGGER: 'trigger',
    GRIP: 'grip',
    TOUCHPAD: 'touchpad',
    THUMBSTICK: 'thumbstick',
    BUTTON: 'button'
  }),

  ButtonTouchThreshold: 0.05,

  AxisTouchThreshold: 0.1
};

export default Constants;

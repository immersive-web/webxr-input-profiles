module.exports = {
  Handedness: Object.freeze({
    NEUTRAL: "neutral",
    LEFT: "left",
    RIGHT: "right"
  }),

  ComponentState: Object.freeze({
    DEFAULT: "default",
    TOUCHED: "onTouch",
    PRESSED: "onPress"
    }),
  
  DataSourceType: Object.freeze({
    BUTTON: "buttonSource",
    DPAD_FROM_AXES: "dpadFromAxesSource",
    DPAD_FROM_BUTTONS: "dpadFromButtonsSource",
    THUMBSTICK: "thumbstickSource",
    TOUCHPAD: "touchpadSource"
  }),

  TouchThreshold: 0.2,
  
  PressThreshold: 0.95
}
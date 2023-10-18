const Constants = {
  Handedness: /* @__PURE__ */ Object.freeze({
    NONE: 'none',
    LEFT: 'left',
    RIGHT: 'right'
  }),

  ComponentState: /* @__PURE__ */ Object.freeze({
    DEFAULT: 'default',
    TOUCHED: 'touched',
    PRESSED: 'pressed'
  }),

  ComponentProperty: /* @__PURE__ */ Object.freeze({
    BUTTON: 'button',
    X_AXIS: 'xAxis',
    Y_AXIS: 'yAxis',
    STATE: 'state'
  }),

  ComponentType: /* @__PURE__ */ Object.freeze({
    TRIGGER: 'trigger',
    SQUEEZE: 'squeeze',
    TOUCHPAD: 'touchpad',
    THUMBSTICK: 'thumbstick',
    BUTTON: 'button'
  }),

  ButtonTouchThreshold: 0.05,

  AxisTouchThreshold: 0.1,

  VisualResponseProperty: /* @__PURE__ */ Object.freeze({
    TRANSFORM: 'transform',
    VISIBILITY: 'visibility'
  })
};

export { Constants };

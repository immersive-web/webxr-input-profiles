export namespace Constants {
  export const enum Handedness {
    NONE,
    LEFT,
    RIGHT
  }

  export const enum ComponentState {
    DEFAULT,
    TOUCHED,
    PRESSED
  }

  export const enum ComponentProperty {
    BUTTON,
    X_AXIS,
    Y_AXIS,
    STATE
  }

  export const enum ComponentType {
    TRIGGER,
    SQUEEZE,
    TOUCHPAD,
    THUMBSTICK,
    BUTTON
  }

  export const ButtonTouchThreshold: number;
  export const AxisTouchThreshold: number;

  export const enum VisualResponseProperty {
    TRANSFORM,
    VISIBILITY
  }
}

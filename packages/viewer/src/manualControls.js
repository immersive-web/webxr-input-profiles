/* eslint-disable import/no-unresolved */
import { Constants } from './motion-controllers.module.js';
/* eslint-enable */

let motionController;
let mockGamepad;
let controlsListElement;

function animationFrameCallback() {
  if (motionController) {
    Object.values(motionController.components).forEach((component) => {
      const dataElement = document.getElementById(`${component.id}_data`);
      dataElement.innerHTML = JSON.stringify(component.data, null, 2);
    });
    window.requestAnimationFrame(animationFrameCallback);
  }
}

function onButtonTouched(event) {
  const { index } = event.target.dataset;
  mockGamepad.buttons[index].touched = event.target.checked;
}

function onButtonPressed(event) {
  const { index } = event.target.dataset;
  mockGamepad.buttons[index].pressed = event.target.checked;
}

function onButtonValueChange(event) {
  const { index } = event.target.dataset;
  mockGamepad.buttons[index].value = Number(event.target.value);
}

function onAxisValueChange(event) {
  const { index } = event.target.dataset;
  mockGamepad.axes[index] = Number(event.target.value);
}

function clear() {
  motionController = undefined;
  mockGamepad = undefined;

  if (!controlsListElement) {
    controlsListElement = document.getElementById('controlsList');
  }
  controlsListElement.innerHTML = '';
}

function addButtonControls(componentControlsElement, buttonIndex) {
  const buttonControlsElement = document.createElement('div');
  buttonControlsElement.setAttribute('class', 'componentControls');

  buttonControlsElement.innerHTML += `
  <label>buttonValue</label>
  <input id="buttons[${buttonIndex}].value" data-index="${buttonIndex}" type="range" min="0" max="1" step="0.01" value="0">
  
  <label>touched</label>
  <input id="buttons[${buttonIndex}].touched" data-index="${buttonIndex}" type="checkbox">

  <label>pressed</label>
  <input id="buttons[${buttonIndex}].pressed" data-index="${buttonIndex}" type="checkbox">
  `;

  componentControlsElement.appendChild(buttonControlsElement);

  document.getElementById(`buttons[${buttonIndex}].value`).addEventListener('input', onButtonValueChange);
  document.getElementById(`buttons[${buttonIndex}].touched`).addEventListener('click', onButtonTouched);
  document.getElementById(`buttons[${buttonIndex}].pressed`).addEventListener('click', onButtonPressed);
}

function addAxisControls(componentControlsElement, axisName, axisIndex) {
  const axisControlsElement = document.createElement('div');
  axisControlsElement.setAttribute('class', 'componentControls');

  axisControlsElement.innerHTML += `
  <label>${axisName}<label>
  <input id="axes[${axisIndex}]" data-index="${axisIndex}"
          type="range" min="-1" max="1" step="0.01" value="0">
  `;

  componentControlsElement.appendChild(axisControlsElement);

  document.getElementById(`axes[${axisIndex}]`).addEventListener('input', onAxisValueChange);
}

function build(sourceMotionController) {
  clear();

  motionController = sourceMotionController;
  mockGamepad = motionController.xrInputSource.gamepad;

  Object.values(motionController.components).forEach((component) => {
    const {
      [Constants.ComponentProperty.BUTTON]: buttonIndex,
      [Constants.ComponentProperty.X_AXIS]: xAxisIndex,
      [Constants.ComponentProperty.Y_AXIS]: yAxisIndex
    } = component.description.gamepadIndices;

    const componentControlsElement = document.createElement('li');
    componentControlsElement.setAttribute('class', 'component');
    controlsListElement.appendChild(componentControlsElement);

    const headingElement = document.createElement('h4');
    headingElement.innerText = `${component.id}`;
    componentControlsElement.appendChild(headingElement);

    if (buttonIndex !== undefined) {
      addButtonControls(componentControlsElement, buttonIndex);
    }

    if (xAxisIndex !== undefined) {
      addAxisControls(componentControlsElement, 'xAxis', xAxisIndex);
    }

    if (yAxisIndex !== undefined) {
      addAxisControls(componentControlsElement, 'yAxis', yAxisIndex);
    }

    const dataElement = document.createElement('pre');
    dataElement.id = `${component.id}_data`;
    componentControlsElement.appendChild(dataElement);

    window.requestAnimationFrame(animationFrameCallback);
  });
}

export default { clear, build };

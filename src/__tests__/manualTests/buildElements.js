/* eslint import/no-unresolved: off */

let mockXRInputSource;
let motionController;

function onButtonTouched(event) {
  const { index } = event.target.dataset;
  mockXRInputSource.gamepad.buttons[index].touched = event.target.checked;
}

function onButtonPressed(event) {
  const { index } = event.target.dataset;
  mockXRInputSource.gamepad.buttons[index].pressed = event.target.checked;
}

function onButtonValueChange(event) {
  const { index } = event.target.dataset;
  mockXRInputSource.gamepad.buttons[index].value = Number(event.target.value);
}

function onAxisValueChange(event) {
  const { index } = event.target.dataset;
  mockXRInputSource.gamepad.axes[index] = Number(event.target.value);
}

function buildElements(controller) {
  motionController = controller;
  mockXRInputSource = motionController.xrInputSource;

  const profileIdElement = document.getElementById('profileId');
  profileIdElement.innerText = motionController.id;

  const controlsElement = document.getElementById('controls');

  Object.values(motionController.components).forEach((component) => {
    const { buttonIndex } = component.dataSource;
    const { xAxisIndex } = component.dataSource;
    const { yAxisIndex } = component.dataSource;
    const hasAxes = (xAxisIndex !== undefined && yAxisIndex !== undefined);

    let innerHtml = `
      <h4>Component ${component.id}</h4>
    `;

    if (buttonIndex !== undefined) {
      innerHtml += `
      <label>buttonValue<label>
      <input id="buttonValue${buttonIndex}" data-index="${buttonIndex}" type="range" min="0" max="1" step="0.01" value="0">
      
      <label>touched</label>
      <input id="buttonTouched${buttonIndex}" data-index="${buttonIndex}" type="checkbox">

      <label>pressed</label>
      <input id="buttonPressed${buttonIndex}" data-index="${buttonIndex}" type="checkbox">
      `;
    }

    if (hasAxes) {
      innerHtml += `
      <br/>
      <label>xAxis<label>
      <input id="axis${xAxisIndex}" data-index="${xAxisIndex}"
             type="range" min="-1" max="1" step="0.01" value="0">
      <label>yAxis<label>
      <input id="axis${yAxisIndex}" data-index="${yAxisIndex}"
             type="range" min="-1" max="1" step="0.01" value="0">
    `;
    }

    const listElement = document.createElement('li');
    listElement.innerHTML = innerHtml;
    controlsElement.appendChild(listElement);

    if (buttonIndex !== undefined) {
      document.getElementById(`buttonValue${buttonIndex}`).addEventListener('input', onButtonValueChange);
      document.getElementById(`buttonTouched${buttonIndex}`).addEventListener('click', onButtonTouched);
      document.getElementById(`buttonPressed${buttonIndex}`).addEventListener('click', onButtonPressed);
    }

    if (hasAxes) {
      document.getElementById(`axis${xAxisIndex}`).addEventListener('input', onAxisValueChange);
      document.getElementById(`axis${yAxisIndex}`).addEventListener('input', onAxisValueChange);
    }
  });
}

export default buildElements;

let controlsListElement;
let mockGamepad;

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
  if (!controlsListElement) {
    controlsListElement = document.getElementById('controlsList');
  }
  controlsListElement.innerHTML = '';
  mockGamepad = undefined;
}

function build(motionController) {
  clear();

  mockGamepad = motionController.xrInputSource.gamepad;

  Object.values(motionController.components).forEach((component) => {
    const { button, xAxis, yAxis } = component.description.gamepadIndices;

    let innerHtml = `
      <h4>Component ${component.id}</h4>
    `;

    if (button !== undefined) {
      innerHtml += `
      <label>buttonValue<label>
      <input id="buttonValue${button}" data-index="${button}" type="range" min="0" max="1" step="0.01" value="0">
      
      <label>touched</label>
      <input id="buttonTouched${button}" data-index="${button}" type="checkbox">

      <label>pressed</label>
      <input id="buttonPressed${button}" data-index="${button}" type="checkbox">
      `;
    }

    if (xAxis !== undefined) {
      innerHtml += `
      <br/>
      <label>xAxis<label>
      <input id="axis${xAxis}" data-index="${xAxis}"
             type="range" min="-1" max="1" step="0.01" value="0">
      `;
    }

    if (yAxis !== undefined) {
      innerHtml += `
        <label>yAxis<label>
        <input id="axis${yAxis}" data-index="${yAxis}"
              type="range" min="-1" max="1" step="0.01" value="0">
      `;
    }

    const listElement = document.createElement('li');
    listElement.setAttribute('class', 'component');
    listElement.innerHTML = innerHtml;
    controlsListElement.appendChild(listElement);

    if (button !== undefined) {
      document.getElementById(`buttonValue${button}`).addEventListener('input', onButtonValueChange);
      document.getElementById(`buttonTouched${button}`).addEventListener('click', onButtonTouched);
      document.getElementById(`buttonPressed${button}`).addEventListener('click', onButtonPressed);
    }

    if (xAxis !== undefined) {
      document.getElementById(`axis${xAxis}`).addEventListener('input', onAxisValueChange);
    }

    if (yAxis !== undefined) {
      document.getElementById(`axis${yAxis}`).addEventListener('input', onAxisValueChange);
    }
  });
}

export default { clear, build };

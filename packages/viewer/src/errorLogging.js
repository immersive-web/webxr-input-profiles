const errorsElementId = 'errors';
let listElement;

function toggleVisibility() {
  const errorsElement = document.getElementById(errorsElementId);
  errorsElement.hidden = errorsElement.children.length === 0;
}

function addErrorElement(errorMessage) {
  const errorsElement = document.getElementById(errorsElementId);
  if (!listElement) {
    listElement = document.createElement('ul');
    errorsElement.appendChild(listElement);
  }

  const itemElement = document.createElement('li');
  itemElement.innerText = errorMessage;
  listElement.appendChild(itemElement);

  toggleVisibility();
}

const ErrorLogging = {
  log: (errorMessage) => {
    addErrorElement(errorMessage);

    /* eslint-disable-next-line no-console */
    console.error(errorMessage);
  },

  throw: (errorMessage) => {
    addErrorElement(errorMessage);
    throw new Error(errorMessage);
  },

  clear: () => {
    if (listElement) {
      const errorsElement = document.getElementById(errorsElementId);
      errorsElement.removeChild(listElement);
      listElement = undefined;
    }
    toggleVisibility();
  },

  clearAll: () => {
    const errorsElement = document.getElementById(errorsElementId);
    errorsElement.innerHTML = '';
    listElement = undefined;
    toggleVisibility();
  }
};

export default ErrorLogging;

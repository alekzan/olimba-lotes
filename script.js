// Prevent default drag/drop behavior on the document
document.addEventListener('dragover', (e) => {
  e.preventDefault();
});
document.addEventListener('drop', (e) => {
  e.preventDefault();
});

// Global variables
let batches = [];
let processed = [];
let currentBatch = 0;
let individualCount = 0;   // Number of batches from "Individuales"
let multiplesCount = 0;    // Number of batches from "Multiples"

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // DOM element references
  const excelFileInput = document.getElementById('excelFile');
  const dropZone = document.getElementById('dropZone');
  const uploadButton = document.getElementById('uploadButton');
  const appContent = document.getElementById('appContent');
  const batchHeader = document.getElementById('batchHeader');
  const batchContent = document.getElementById('batchContent');
  const warningMessage = document.getElementById('warningMessage');
  const prevButton = document.getElementById('prevButton');
  const nextButton = document.getElementById('nextButton');
  const errorMessage = document.getElementById('errorMessage');
  const copyButton = document.getElementById('copyButton');
  const resetButton = document.getElementById('resetButton');

  // Event listener for file upload from hidden file input
  if (excelFileInput) {
    excelFileInput.addEventListener('change', handleFile, false);
  } else {
    console.error("Element 'excelFile' not found");
  }
  
  // Upload button event listener (manual file selection)
  if (uploadButton && excelFileInput) {
    uploadButton.addEventListener('click', () => {
      excelFileInput.click();
    });
  } else {
    console.error("Elements 'uploadButton' or 'excelFile' not found");
  }
  
  // Copy button event listener
  if (copyButton) {
    copyButton.addEventListener('click', () => {
      const textToCopy = batchContent.textContent;
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          processed[currentBatch] = true;
          updateBatchDisplay();
          showPopup('IDs copiados al portapapeles!');
        })
        .catch(err => {
          console.error('Error al copiar:', err);
        });
    });
  }
  
  // Drop zone event listeners
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile({ target: { files: files } });
      }
    });
  } else {
    console.error("Element 'dropZone' not found");
  }
  
  // Reset button event listener
  if (resetButton) {
    resetButton.addEventListener('click', resetApp);
  }
  
  // Next button event
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      if (currentBatch < batches.length - 1) {
        currentBatch++;
        updateBatchDisplay();
      }
    });
  }
  
  // Previous button event
  if (prevButton) {
    prevButton.addEventListener('click', () => {
      if (currentBatch > 0) {
        currentBatch--;
        updateBatchDisplay();
      }
    });
  }
});

// Function to display a pop-up message that auto-closes after 3 seconds
function showPopup(msg) {
  const popup = document.createElement("div");
  popup.textContent = msg;
  popup.style.position = "fixed";
  popup.style.top = "20px";
  popup.style.right = "20px";
  popup.style.backgroundColor = "#28a745";  // Green background
  popup.style.color = "#fff";
  popup.style.padding = "10px 20px";
  popup.style.borderRadius = "5px";
  popup.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.3)";
  popup.style.zIndex = "1000";
  document.body.appendChild(popup);
  
  setTimeout(() => {
    popup.remove();
  }, 3000);
}

// Function to handle file (from drop or manual selection)
function handleFile(event) {
  if (typeof XLSX === 'undefined') {
    showError("La biblioteca SheetJS no está cargada correctamente. Verifica la conexión a Internet o la carga del script.");
    return;
  }

  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Process "Individuales" sheet (if available)
      let individualBatches = [];
      if (workbook.SheetNames.includes("Individuales")) {
        const sheetInd = workbook.Sheets["Individuales"];
        const jsonDataInd = XLSX.utils.sheet_to_json(sheetInd, { header: 1 });
        const headerRowInd = jsonDataInd[0];
        if (headerRowInd && headerRowInd.length > 0) {
          const indexInd = headerRowInd.indexOf("Id del pedido");
          if (indexInd !== -1) {
            let idsInd = [];
            for (let i = 1; i < jsonDataInd.length; i++) {
              const row = jsonDataInd[i];
              if (row && row[indexInd] !== undefined && row[indexInd] !== null) {
                idsInd.push(row[indexInd]);
              }
            }
            const batchSize = 30;
            for (let i = 0; i < idsInd.length; i += batchSize) {
              individualBatches.push(idsInd.slice(i, i + batchSize));
            }
          }
        }
      }
      
      // Process "Multiples" sheet (if available)
      let multiplesBatches = [];
      if (workbook.SheetNames.includes("Multiples")) {
        const sheetMult = workbook.Sheets["Multiples"];
        const jsonDataMult = XLSX.utils.sheet_to_json(sheetMult, { header: 1 });
        const headerRowMult = jsonDataMult[0];
        if (headerRowMult && headerRowMult.length > 0) {
          const indexMult = headerRowMult.indexOf("Id del pedido");
          if (indexMult !== -1) {
            let idsMult = [];
            for (let i = 1; i < jsonDataMult.length; i++) {
              const row = jsonDataMult[i];
              if (row && row[indexMult] !== undefined && row[indexMult] !== null) {
                idsMult.push(row[indexMult]);
              }
            }
            const batchSize = 30;
            for (let i = 0; i < idsMult.length; i += batchSize) {
              multiplesBatches.push(idsMult.slice(i, i + batchSize));
            }
          }
        }
      }
      
      // Combine batches: Individuales first, then Multiples
      batches = individualBatches.concat(multiplesBatches);
      individualCount = individualBatches.length;
      multiplesCount = multiplesBatches.length;
      processed = new Array(batches.length).fill(false);
      currentBatch = 0;
      
      if (batches.length === 0) {
        showError("No se encontraron valores en la columna 'Id del pedido' en ninguna hoja.");
        return;
      }
      
      // Show the first batch
      const errorMessage = document.getElementById('errorMessage');
      const appContent = document.getElementById('appContent');
      if (errorMessage && appContent) {
        errorMessage.classList.add('d-none');
        appContent.classList.remove('d-none');
        updateBatchDisplay();
      }
    } catch (error) {
      showError("Error al procesar el archivo: " + error.message);
    }
  };

  reader.onerror = function(e) {
    showError("Error al leer el archivo.");
  };

  reader.readAsArrayBuffer(file);
}

// Show error message
function showError(msg) {
  const errorMessage = document.getElementById('errorMessage');
  const appContent = document.getElementById('appContent');
  if (errorMessage && appContent) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove('d-none');
    appContent.classList.add('d-none');
  } else {
    alert("Error: " + msg);
  }
}

// Function to blink the card 2 times then remain on the new color
function blinkCard() {
  const card = document.querySelector('.card.mb-3');
  if (!card) return;
  
  const onDuration = 150;  // time in ms for "on" state
  const offDuration = 150; // time in ms for "off" state
  
  // Start blinking sequence:
  // 1st blink: set to new color, then white.
  setTimeout(() => {
    card.style.backgroundColor = '#ffebee'; // first "on"
    setTimeout(() => {
      card.style.backgroundColor = '#ffffff'; // first "off"
      // 2nd blink: set to new color and then leave it on.
      setTimeout(() => {
        card.style.backgroundColor = '#ffebee'; // second "on" - final state
      }, offDuration);
    }, onDuration);
  }, 0);
}

// Update batch display and manage blinking/warning
function updateBatchDisplay() {
  if (batches.length === 0) return;

  const batchHeader = document.getElementById('batchHeader');
  const batchContent = document.getElementById('batchContent');
  const warningMessage = document.getElementById('warningMessage');

  // Reset card background if not processed
  const batchCard = document.querySelector('.card.mb-3');
  if (!processed[currentBatch] && batchCard) {
    batchCard.style.backgroundColor = '#ffffff';
  }
  
  // Calculate total global batches
  const totalGlobal = individualCount + multiplesCount;
  
  // Update header with global numbering and type
  if (currentBatch < individualCount) {
    batchHeader.textContent = `Tanda Individuales: ${currentBatch + 1} de ${totalGlobal}`;
  } else {
    batchHeader.textContent = `Tanda Multiples: ${currentBatch + 1} de ${totalGlobal}`;
  }
  
  const currentIds = batches[currentBatch];
  const idsStr = currentIds.map(id => id + ',').join('\n');
  batchContent.textContent = idsStr;
  
  if (warningMessage) {
    if (processed[currentBatch]) {
      warningMessage.classList.remove('d-none');
      // Blink the card 2 times then leave it with the new color
      blinkCard();
    } else {
      warningMessage.classList.add('d-none');
    }
  }
}

// Reset application state
function resetApp() {
  batches = [];
  processed = [];
  currentBatch = 0;
  individualCount = 0;
  multiplesCount = 0;
  const appContent = document.getElementById('appContent');
  const errorMessage = document.getElementById('errorMessage');
  const excelFileInput = document.getElementById('excelFile');
  // Reset card background to white
  const batchCard = document.querySelector('.card.mb-3');
  if (batchCard) {
    batchCard.style.backgroundColor = '#ffffff';
  }
  if (appContent) appContent.classList.add('d-none');
  if (errorMessage) errorMessage.classList.add('d-none');
  if (excelFileInput) excelFileInput.value = "";
}

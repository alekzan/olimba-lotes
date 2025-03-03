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
  
        if (!workbook.SheetNames.includes("Individuales")) {
          showError("La hoja 'Individuales' no se encontró en el archivo.");
          return;
        }
  
        const sheet = workbook.Sheets["Individuales"];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headerRow = jsonData[0];
        if (!headerRow || headerRow.length === 0) {
          showError("No se encontró encabezado en la hoja 'Individuales'.");
          return;
        }
  
        const idPedidoIndex = headerRow.indexOf("Id del pedido");
        if (idPedidoIndex === -1) {
          showError("No se encontró la columna 'Id del pedido' en la hoja 'Individuales'.");
          return;
        }
  
        // Extract IDs
        const ids = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row[idPedidoIndex] !== undefined && row[idPedidoIndex] !== null) {
            ids.push(row[idPedidoIndex]);
          }
        }
  
        // Split into batches of 30
        const batchSize = 30;
        batches = [];
        for (let i = 0; i < ids.length; i += batchSize) {
          batches.push(ids.slice(i, i + batchSize));
        }
  
        processed = new Array(batches.length).fill(false);
        currentBatch = 0;
  
        if (batches.length === 0) {
          showError("No se encontraron valores en la columna 'Id del pedido'.");
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
  
    const totalBatches = batches.length;
    batchHeader.textContent = `Tanda ${currentBatch + 1} de ${totalBatches}`;
  
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
  
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileName = document.querySelector('.file-name');
const btnRemove = document.getElementById('btn-remove');
const btnConvert = document.getElementById('btn-convert');
const loading = document.getElementById('loading');
const modeToggle = document.getElementById('mode-toggle');
const labelIno2Esp = document.getElementById('label-ino2esp');
const labelEsp2Ino = document.getElementById('label-esp2ino');

let selectedFile = null;
let mode = 'ino2esp'; // default

// Toggle logic
modeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        mode = 'esp2ino';
        labelIno2Esp.classList.remove('active');
        labelEsp2Ino.classList.add('active');
    } else {
        mode = 'ino2esp';
        labelIno2Esp.classList.add('active');
        labelEsp2Ino.classList.remove('active');
    }
});

// Handle Drag & Drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});

dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
});

// Handle Click
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', function() {
    handleFiles(this.files);
});

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        if (!file.name.endsWith('.zip')) {
            alert('Please upload a .zip file containing your project!');
            return;
        }
        selectedFile = file;
        
        dropZone.style.display = 'none';
        fileInfo.classList.remove('hidden');
        fileName.textContent = file.name;
        btnConvert.disabled = false;
    }
}

// Remove File
btnRemove.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    dropZone.style.display = 'block';
    fileInfo.classList.add('hidden');
    btnConvert.disabled = true;
});

// Upload and Convert
btnConvert.addEventListener('click', async () => {
    if (!selectedFile) return;

    loading.classList.remove('hidden');

    try {
        const zipData = await selectedFile.arrayBuffer();
        const inputZip = await JSZip.loadAsync(zipData);
        const outputZip = new JSZip();
        
        const projectName = selectedFile.name.replace('.zip', '');

        if (mode === 'ino2esp') {
            // Arduino -> ESP-IDF
            let foundIno = false;
            let result = null;

            // Process files
            for (let [filename, fileData] of Object.entries(inputZip.files)) {
                if (fileData.dir) continue;
                
                const content = await fileData.async("string");
                const baseName = filename.split('/').pop();
                
                if (baseName.endsWith('.ino')) {
                    foundIno = true;
                    result = convertToEspIdf(content, projectName);
                } else if (baseName.endsWith('.h') || baseName.endsWith('.cpp') || baseName.endsWith('.c')) {
                    // Copy other source files to main folder
                    outputZip.folder("main").file(baseName, content);
                }
            }

            if (!foundIno || !result) {
                throw new Error("No .ino file found in the zip!");
            }

            outputZip.file("CMakeLists.txt", result.rootCMakeList);
            outputZip.folder("main").file("CMakeLists.txt", result.cmakeList);
            outputZip.folder("main").file("main.cpp", result.mainC);

        } else {
            // ESP-IDF -> Arduino
            let foundMain = false;
            let inoCode = "";
            
            const arduinoFolder = outputZip.folder(projectName);

            for (let [filename, fileData] of Object.entries(inputZip.files)) {
                if (fileData.dir) continue;
                
                const content = await fileData.async("string");
                const baseName = filename.split('/').pop();
                
                if (baseName === 'main.cpp' || baseName === 'main.c') {
                    foundMain = true;
                    inoCode = convertToArduino(content);
                    arduinoFolder.file(`${projectName}.ino`, inoCode);
                } else if ((baseName.endsWith('.h') || baseName.endsWith('.cpp') || baseName.endsWith('.c')) && baseName !== 'CMakeLists.txt') {
                    // Copy other source files
                    arduinoFolder.file(baseName, content);
                }
            }

            if (!foundMain) {
                throw new Error("No main.cpp or main.c found in the ESP-IDF zip!");
            }
        }

        // Generate ZIP
        const contentBlob = await outputZip.generateAsync({type:"blob"});
        
        // Download
        const url = window.URL.createObjectURL(contentBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const outName = mode === 'ino2esp' ? `${projectName}_espidf.zip` : `${projectName}_arduino.zip`;
        a.download = outName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        loading.classList.add('hidden');
    }
});

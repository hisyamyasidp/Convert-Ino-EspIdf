const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileName = document.querySelector('.file-name');
const btnRemove = document.getElementById('btn-remove');
const btnConvert = document.getElementById('btn-convert');
const loading = document.getElementById('loading');

let selectedFile = null;

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
        if (!file.name.endsWith('.ino')) {
            alert('Please upload an .ino file!');
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
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const inoContent = e.target.result;
                const projectName = selectedFile.name.replace('.ino', '');
                
                // Call translator function from translator.js
                // Note: convert is a global function now because module.exports was removed
                const result = convert(inoContent, projectName);
                
                // Initialize JSZip
                const zip = new JSZip();
                
                // Add files to zip
                zip.file("CMakeLists.txt", result.rootCMakeList);
                
                const mainFolder = zip.folder("main");
                mainFolder.file("CMakeLists.txt", result.cmakeList);
                mainFolder.file("main.cpp", result.mainC);
                
                // Generate ZIP
                const content = await zip.generateAsync({type:"blob"});
                
                // Download
                const url = window.URL.createObjectURL(content);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${projectName}_espidf.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                
            } catch (err) {
                alert('Conversion Error: ' + err.message);
            } finally {
                loading.classList.add('hidden');
            }
        };
        
        reader.readAsText(selectedFile);
        
    } catch (error) {
        alert('Error: ' + error.message);
        loading.classList.add('hidden');
    }
});

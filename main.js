// Main entry point for the Discord Export Visualizer.
// This script wires up the file upload UI, extracts the ZIP archive using JSZip,
// and orchestrates the individual modules responsible for each folder of the export.
// It also exposes a simple test runner to verify that individual parsing functions behave as expected.

// We use the global JSZip object loaded in index.html. ESLint and bundlers
// are not available in this offline environment, so we rely on global imports.

/* global JSZip */

// Container elements
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const uploadStatus = document.getElementById('upload-status');
const nav = document.getElementById('nav');
const content = document.getElementById('content');
const testSection = document.getElementById('test-section');
const runTestsBtn = document.getElementById('runTests');
const testResults = document.getElementById('testResults');

// Placeholder for loaded modules and data
const modules = {};
let zip; // holds the JSZip instance after loading

// Utility: create a navigation button
function createNavButton(name, handler) {
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.addEventListener('click', () => {
        // Set active class on the clicked button and remove from others
        Array.from(nav.children).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Clear previous content
        content.innerHTML = '';
        handler();
    });
    return btn;
}

// File input handler: load the selected ZIP
async function handleFile(file) {
    if (!file) return;
    uploadStatus.textContent = 'Loading ZIP file...';
    try {
        zip = await JSZip.loadAsync(file);
        uploadStatus.textContent = 'ZIP file loaded successfully.';
        // Determine which top-level folders exist
        const rootFolders = Object.keys(zip.files)
            .filter(name => name.endsWith('/'))
            .map(name => name.split('/')[0])
            .filter((v, i, a) => a.indexOf(v) === i);
        // Dynamically import modules based on available folders
        nav.innerHTML = '';
        for (const folder of rootFolders) {
            switch (folder.toLowerCase()) {
                case 'account':
                    modules.account = await import('./modules/account.js');
                    nav.appendChild(createNavButton('Account', () => modules.account.render(zip, content)));
                    break;
                case 'messages':
                    modules.messages = await import('./modules/messages.js');
                    nav.appendChild(createNavButton('Messages', () => modules.messages.render(zip, content)));
                    break;
            }
        }
        // Show nav and test section
        nav.classList.remove('hidden');
        testSection.classList.remove('hidden');
    } catch (err) {
        console.error(err);
        uploadStatus.textContent = 'Error loading ZIP file: ' + err.message;
    }
}

// Drag and drop behaviour
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    fileInput.files = e.dataTransfer.files;
    handleFile(file);
});

// File input change
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    handleFile(file);
});

// Test runner: iterate over modules and collect test results
runTestsBtn.addEventListener('click', async () => {
    testResults.innerHTML = '';
    const resultsList = document.createElement('ul');
    // For each loaded module run its tests if available
    const modulesToTest = Object.values(modules);
    let allPassed = true;
    for (const mod of modulesToTest) {
        if (typeof mod.test === 'function') {
            const modResults = await mod.test(zip);
            for (const res of modResults) {
                const li = document.createElement('li');
                li.textContent = `${res.name}: ${res.passed ? 'OK' : 'Failed'}`;
                li.className = res.passed ? 'test-pass' : 'test-fail';
                resultsList.appendChild(li);
                if (!res.passed) allPassed = false;
            }
        }
    }
    // If there were no testable modules
    if (resultsList.children.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No tests available.';
        resultsList.appendChild(li);
    }
    testResults.appendChild(resultsList);
    // Summary message
    const summary = document.createElement('p');
    summary.textContent = allPassed ? 'All tests passed.' : 'At least one test failed.';
    summary.className = allPassed ? 'test-pass' : 'test-fail';
    testResults.appendChild(summary);
});

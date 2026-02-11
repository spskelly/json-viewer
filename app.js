// register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(reg => console.log('service worker registered', reg))
    .catch(err => console.log('service worker registration failed', err));
}

// state
let jsonData = null;
let currentView = 'tree'; // 'tree' or 'raw'
let searchQuery = '';
let currentFileName = '';

// dom elements
const dropZone = document.getElementById('dropZone');
const viewerContainer = document.getElementById('viewerContainer');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const validation = document.getElementById('validation');
const fileInput = document.getElementById('fileInput');
const openFileBtn = document.getElementById('openFile');
const toggleViewBtn = document.getElementById('toggleView');
const collapseAllBtn = document.getElementById('collapseAll');
const expandAllBtn = document.getElementById('expandAll');
const toggleThemeBtn = document.getElementById('toggleTheme');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const treeView = document.getElementById('treeView');
const rawView = document.getElementById('rawView');
const rawContent = document.getElementById('rawContent');
const statsContainer = document.getElementById('statsContainer');
const copyToast = document.getElementById('copyToast');

// theme handling
let isDarkMode = true;
toggleThemeBtn.addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('light-theme', !isDarkMode);
});

// file handling api
if ('launchQueue' in window) {
  console.log('file handling api supported');
  window.launchQueue.setConsumer(async (launchParams) => {
    if (!launchParams.files.length) return;
    const fileHandle = launchParams.files[0];
    const file = await fileHandle.getFile();
    await loadJSONFile(file);
  });
}

// manual file selection
openFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) await loadJSONFile(file);
});

// drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) await loadJSONFile(file);
});

// load json file
async function loadJSONFile(file) {
  try {
    currentFileName = file.name;
    const text = await file.text();
    
    // try to parse json
    try {
      jsonData = JSON.parse(text);
      
      // show viewer, hide drop zone
      dropZone.style.display = 'none';
      viewerContainer.style.display = 'block';
      fileInfo.style.display = 'flex';
      toggleViewBtn.style.display = 'inline-block';
      collapseAllBtn.style.display = 'inline-block';
      expandAllBtn.style.display = 'inline-block';
      
      // update ui
      fileName.textContent = file.name;
      fileSize.textContent = formatFileSize(file.size);
      validation.textContent = '✓ Valid JSON';
      validation.className = 'validation valid';
      
      updateStats();
      renderTree();
      
      document.title = `${file.name} - JSON Viewer`;
      
    } catch (err) {
      validation.textContent = `✗ Invalid JSON: ${err.message}`;
      validation.className = 'validation invalid';
      fileInfo.style.display = 'flex';
      alert('invalid json: ' + err.message);
    }
    
  } catch (err) {
    alert('error loading file: ' + err.message);
  }
}

// update statistics
function updateStats() {
  const stats = getJSONStats(jsonData);
  statsContainer.textContent = `${stats.keys} keys, ${stats.depth} max depth, ${stats.arrays} arrays, ${stats.objects} objects`;
}

function getJSONStats(obj, depth = 0) {
  let keys = 0;
  let maxDepth = depth;
  let arrays = 0;
  let objects = 0;
  
  if (Array.isArray(obj)) {
    arrays++;
    obj.forEach(item => {
      const stats = getJSONStats(item, depth + 1);
      keys += stats.keys;
      maxDepth = Math.max(maxDepth, stats.depth);
      arrays += stats.arrays;
      objects += stats.objects;
    });
  } else if (typeof obj === 'object' && obj !== null) {
    objects++;
    Object.keys(obj).forEach(key => {
      keys++;
      const stats = getJSONStats(obj[key], depth + 1);
      keys += stats.keys;
      maxDepth = Math.max(maxDepth, stats.depth);
      arrays += stats.arrays;
      objects += stats.objects;
    });
  }
  
  return { keys, depth: maxDepth, arrays, objects };
}

// render tree view
function renderTree() {
  treeView.innerHTML = '';
  const tree = buildTreeNode(jsonData, 'root', []);
  treeView.appendChild(tree);
}

function buildTreeNode(data, key, path) {
  const container = document.createElement('div');
  container.className = 'tree-node';
  
  const currentPath = [...path, key];
  const pathString = buildPathString(currentPath);
  
  // check if matches search
  const matchesSearch = !searchQuery || 
    key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (typeof data === 'string' && data.toLowerCase().includes(searchQuery.toLowerCase()));
  
  if (searchQuery && !matchesSearch && !hasMatchingChildren(data, searchQuery)) {
    return container;
  }
  
  if (Array.isArray(data)) {
    // array
    const header = document.createElement('div');
    header.className = 'tree-header' + (matchesSearch ? ' highlight' : '');
    
    const toggle = document.createElement('span');
    toggle.className = 'toggle';
    toggle.textContent = '▼';
    
    const keySpan = document.createElement('span');
    keySpan.className = 'key';
    keySpan.textContent = key;
    
    const typeSpan = document.createElement('span');
    typeSpan.className = 'type';
    typeSpan.textContent = `Array[${data.length}]`;
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-path';
    copyBtn.textContent = '📋';
    copyBtn.title = 'Copy path';
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      copyPath(pathString);
    };
    
    header.appendChild(toggle);
    header.appendChild(keySpan);
    header.appendChild(typeSpan);
    header.appendChild(copyBtn);
    container.appendChild(header);
    
    const children = document.createElement('div');
    children.className = 'tree-children';
    
    data.forEach((item, i) => {
      const child = buildTreeNode(item, `[${i}]`, currentPath);
      children.appendChild(child);
    });
    
    container.appendChild(children);
    
    header.onclick = () => {
      children.classList.toggle('collapsed');
      toggle.textContent = children.classList.contains('collapsed') ? '▶' : '▼';
    };
    
  } else if (typeof data === 'object' && data !== null) {
    // object
    const header = document.createElement('div');
    header.className = 'tree-header' + (matchesSearch ? ' highlight' : '');
    
    const toggle = document.createElement('span');
    toggle.className = 'toggle';
    toggle.textContent = '▼';
    
    const keySpan = document.createElement('span');
    keySpan.className = 'key';
    keySpan.textContent = key;
    
    const typeSpan = document.createElement('span');
    typeSpan.className = 'type';
    typeSpan.textContent = `Object{${Object.keys(data).length}}`;
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-path';
    copyBtn.textContent = '📋';
    copyBtn.title = 'Copy path';
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      copyPath(pathString);
    };
    
    header.appendChild(toggle);
    header.appendChild(keySpan);
    header.appendChild(typeSpan);
    header.appendChild(copyBtn);
    container.appendChild(header);
    
    const children = document.createElement('div');
    children.className = 'tree-children';
    
    Object.entries(data).forEach(([k, v]) => {
      const child = buildTreeNode(v, k, currentPath);
      children.appendChild(child);
    });
    
    container.appendChild(children);
    
    header.onclick = () => {
      children.classList.toggle('collapsed');
      toggle.textContent = children.classList.contains('collapsed') ? '▶' : '▼';
    };
    
  } else {
    // primitive value
    const header = document.createElement('div');
    header.className = 'tree-header tree-leaf' + (matchesSearch ? ' highlight' : '');
    
    const keySpan = document.createElement('span');
    keySpan.className = 'key';
    keySpan.textContent = key;
    
    const separator = document.createElement('span');
    separator.textContent = ': ';
    
    const valueSpan = document.createElement('span');
    valueSpan.className = `value value-${typeof data}`;
    
    if (data === null) {
      valueSpan.className = 'value value-null';
      valueSpan.textContent = 'null';
    } else if (typeof data === 'string') {
      valueSpan.textContent = `"${data}"`;
    } else {
      valueSpan.textContent = String(data);
    }
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-path';
    copyBtn.textContent = '📋';
    copyBtn.title = 'Copy path';
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      copyPath(pathString);
    };
    
    header.appendChild(keySpan);
    header.appendChild(separator);
    header.appendChild(valueSpan);
    header.appendChild(copyBtn);
    container.appendChild(header);
  }
  
  return container;
}

function hasMatchingChildren(data, query) {
  query = query.toLowerCase();
  
  if (Array.isArray(data)) {
    return data.some(item => {
      if (typeof item === 'string' && item.toLowerCase().includes(query)) return true;
      if (typeof item === 'object') return hasMatchingChildren(item, query);
      return false;
    });
  } else if (typeof data === 'object' && data !== null) {
    return Object.entries(data).some(([k, v]) => {
      if (k.toLowerCase().includes(query)) return true;
      if (typeof v === 'string' && v.toLowerCase().includes(query)) return true;
      if (typeof v === 'object') return hasMatchingChildren(v, query);
      return false;
    });
  }
  
  return false;
}

function buildPathString(path) {
  return path.slice(1).map((p, i) => {
    if (p.startsWith('[')) return p;
    return i === 0 ? p : `.${p}`;
  }).join('');
}

// copy path to clipboard
function copyPath(path) {
  navigator.clipboard.writeText(path).then(() => {
    showToast();
  });
}

function showToast() {
  copyToast.classList.add('show');
  setTimeout(() => {
    copyToast.classList.remove('show');
  }, 2000);
}

// toggle view
toggleViewBtn.addEventListener('click', () => {
  if (currentView === 'tree') {
    currentView = 'raw';
    treeView.style.display = 'none';
    rawView.style.display = 'block';
    rawContent.textContent = JSON.stringify(jsonData, null, 2);
    toggleViewBtn.textContent = 'Tree View';
    collapseAllBtn.style.display = 'none';
    expandAllBtn.style.display = 'none';
  } else {
    currentView = 'tree';
    treeView.style.display = 'block';
    rawView.style.display = 'none';
    toggleViewBtn.textContent = 'Raw View';
    collapseAllBtn.style.display = 'inline-block';
    expandAllBtn.style.display = 'inline-block';
  }
});

// collapse/expand all
collapseAllBtn.addEventListener('click', () => {
  document.querySelectorAll('.tree-children').forEach(el => {
    el.classList.add('collapsed');
  });
  document.querySelectorAll('.toggle').forEach(el => {
    el.textContent = '▶';
  });
});

expandAllBtn.addEventListener('click', () => {
  document.querySelectorAll('.tree-children').forEach(el => {
    el.classList.remove('collapsed');
  });
  document.querySelectorAll('.toggle').forEach(el => {
    el.textContent = '▼';
  });
});

// search
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  if (currentView === 'tree') {
    renderTree();
  }
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  if (currentView === 'tree') {
    renderTree();
  }
});

// keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault();
    fileInput.click();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    searchInput.focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault();
    toggleThemeBtn.click();
  }
});

// utility functions
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

console.log('json viewer initialized');

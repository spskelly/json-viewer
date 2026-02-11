// register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js', { scope: '/json-viewer/' })
    .then(reg => console.log('Service worker registered', reg))
    .catch(err => console.log('Service worker registration failed:', err));
}

// constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// state
let jsonData = null;
let currentView = 'tree';
let searchQuery = '';
let currentFileName = '';
let isDarkMode = localStorage.getItem('theme') !== 'light';

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
const toast = document.getElementById('toast');

// apply saved theme
document.body.classList.toggle('light-theme', !isDarkMode);

// theme handling
toggleThemeBtn.addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('light-theme', !isDarkMode);
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
});

// file handling api
if ('launchQueue' in window) {
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
  if (file.size > MAX_FILE_SIZE) {
    showToast(`File too large (${formatFileSize(file.size)}). Max size is ${formatFileSize(MAX_FILE_SIZE)}.`, true);
    return;
  }

  try {
    currentFileName = file.name;
    const text = await file.text();

    try {
      jsonData = JSON.parse(text);

      dropZone.style.display = 'none';
      viewerContainer.style.display = 'block';
      fileInfo.style.display = 'flex';
      toggleViewBtn.style.display = 'inline-block';
      collapseAllBtn.style.display = 'inline-block';
      expandAllBtn.style.display = 'inline-block';

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
      showToast(`Invalid JSON: ${err.message}`, true);
    }

  } catch (err) {
    showToast(`Error loading file: ${err.message}`, true);
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

  const matchesSearch = !searchQuery ||
    key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (typeof data === 'string' && data.toLowerCase().includes(searchQuery.toLowerCase()));

  if (searchQuery && !matchesSearch && !hasMatchingChildren(data, searchQuery)) {
    return container;
  }

  if (Array.isArray(data)) {
    buildCollapsibleNode(container, data, key, currentPath, pathString, matchesSearch, `Array[${data.length}]`, (children) => {
      data.forEach((item, i) => {
        children.appendChild(buildTreeNode(item, `[${i}]`, currentPath));
      });
    });
  } else if (typeof data === 'object' && data !== null) {
    buildCollapsibleNode(container, data, key, currentPath, pathString, matchesSearch, `Object{${Object.keys(data).length}}`, (children) => {
      Object.entries(data).forEach(([k, v]) => {
        children.appendChild(buildTreeNode(v, k, currentPath));
      });
    });
  } else {
    buildLeafNode(container, data, key, pathString, matchesSearch);
  }

  return container;
}

function buildCollapsibleNode(container, data, key, currentPath, pathString, matchesSearch, typeLabel, populateChildren) {
  const header = document.createElement('div');
  header.className = 'tree-header' + (matchesSearch && searchQuery ? ' highlight' : '');
  header.setAttribute('role', 'treeitem');
  header.setAttribute('aria-expanded', 'true');
  header.setAttribute('tabindex', '0');
  header.dataset.path = pathString;

  const toggle = document.createElement('span');
  toggle.className = 'toggle';
  toggle.textContent = '▼';
  toggle.setAttribute('aria-hidden', 'true');

  const keySpan = document.createElement('span');
  keySpan.className = 'key';
  keySpan.textContent = key;

  const typeSpan = document.createElement('span');
  typeSpan.className = 'type';
  typeSpan.textContent = typeLabel;

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-path';
  copyBtn.textContent = '📋';
  copyBtn.setAttribute('aria-label', `Copy path: ${pathString}`);

  header.appendChild(toggle);
  header.appendChild(keySpan);
  header.appendChild(typeSpan);
  header.appendChild(copyBtn);
  container.appendChild(header);

  const children = document.createElement('div');
  children.className = 'tree-children';
  children.setAttribute('role', 'group');

  populateChildren(children);
  container.appendChild(children);
}

function buildLeafNode(container, data, key, pathString, matchesSearch) {
  const header = document.createElement('div');
  header.className = 'tree-header tree-leaf' + (matchesSearch && searchQuery ? ' highlight' : '');
  header.setAttribute('role', 'treeitem');
  header.setAttribute('tabindex', '0');
  header.dataset.path = pathString;

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
  copyBtn.setAttribute('aria-label', `Copy path: ${pathString}`);

  header.appendChild(keySpan);
  header.appendChild(separator);
  header.appendChild(valueSpan);
  header.appendChild(copyBtn);
  container.appendChild(header);
}

// event delegation for tree clicks
treeView.addEventListener('click', (e) => {
  const copyBtn = e.target.closest('.copy-path');
  if (copyBtn) {
    e.stopPropagation();
    const header = copyBtn.closest('.tree-header');
    if (header) copyPath(header.dataset.path);
    return;
  }

  const header = e.target.closest('.tree-header:not(.tree-leaf)');
  if (header) {
    toggleNode(header);
  }
});

// keyboard navigation for tree
treeView.addEventListener('keydown', (e) => {
  const header = e.target.closest('.tree-header');
  if (!header) return;

  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault();
      if (header.classList.contains('tree-leaf')) return;
      toggleNode(header);
      break;
    case 'ArrowDown':
      e.preventDefault();
      focusAdjacentTreeItem(header, 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      focusAdjacentTreeItem(header, -1);
      break;
    case 'ArrowRight':
      e.preventDefault();
      if (header.classList.contains('tree-leaf')) return;
      if (header.getAttribute('aria-expanded') === 'false') {
        toggleNode(header);
      } else {
        const children = header.nextElementSibling;
        if (children) {
          const firstChild = children.querySelector('.tree-header');
          if (firstChild) firstChild.focus();
        }
      }
      break;
    case 'ArrowLeft':
      e.preventDefault();
      if (!header.classList.contains('tree-leaf') && header.getAttribute('aria-expanded') === 'true') {
        toggleNode(header);
      } else {
        const parentGroup = header.closest('.tree-children');
        if (parentGroup) {
          const parentHeader = parentGroup.previousElementSibling;
          if (parentHeader && parentHeader.classList.contains('tree-header')) {
            parentHeader.focus();
          }
        }
      }
      break;
  }
});

function toggleNode(header) {
  const children = header.nextElementSibling;
  if (!children || !children.classList.contains('tree-children')) return;
  const toggle = header.querySelector('.toggle');
  children.classList.toggle('collapsed');
  const isCollapsed = children.classList.contains('collapsed');
  toggle.textContent = isCollapsed ? '▶' : '▼';
  header.setAttribute('aria-expanded', String(!isCollapsed));
}

function focusAdjacentTreeItem(current, direction) {
  const allHeaders = [...treeView.querySelectorAll('.tree-header')];
  const visibleHeaders = allHeaders.filter(h => {
    let el = h.closest('.tree-children');
    while (el) {
      if (el.classList.contains('collapsed')) return false;
      el = el.parentElement?.closest('.tree-children');
    }
    return true;
  });
  const idx = visibleHeaders.indexOf(current);
  const next = visibleHeaders[idx + direction];
  if (next) next.focus();
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
  if (!path) return;
  try {
    navigator.clipboard.writeText(path).then(() => {
      showToast('Path copied to clipboard!');
    }).catch(() => {
      showToast('Failed to copy path', true);
    });
  } catch {
    showToast('Clipboard not available', true);
  }
}

// toast notifications
let toastTimeout;
function showToast(message, isError = false) {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.className = 'toast' + (isError ? ' toast-error' : '');
  // force reflow so re-adding 'show' triggers transition even if already visible
  toast.offsetHeight;
  toast.classList.add('show');
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
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
  treeView.querySelectorAll('.tree-children').forEach(el => {
    el.classList.add('collapsed');
  });
  treeView.querySelectorAll('.toggle').forEach(el => {
    el.textContent = '▶';
  });
  treeView.querySelectorAll('.tree-header[aria-expanded]').forEach(el => {
    el.setAttribute('aria-expanded', 'false');
  });
});

expandAllBtn.addEventListener('click', () => {
  treeView.querySelectorAll('.tree-children').forEach(el => {
    el.classList.remove('collapsed');
  });
  treeView.querySelectorAll('.toggle').forEach(el => {
    el.textContent = '▼';
  });
  treeView.querySelectorAll('.tree-header[aria-expanded]').forEach(el => {
    el.setAttribute('aria-expanded', 'true');
  });
});

// search with debounce
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = searchInput.value;
    if (jsonData && currentView === 'tree') {
      renderTree();
    }
  }, 250);
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearTimeout(searchTimeout);
  if (jsonData && currentView === 'tree') {
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

console.log('JSON Viewer initialized');

# JSON Viewer PWA

A lightweight, fast JSON file viewer with collapsible tree view, validation, and search. Set it as your default `.json` handler for instant pretty-printing.

## Features

- 🚀 **Instant loading** - Offline-first PWA with service worker caching
- 📂 **File handler** - Set as default app for `.json` files (Chromium browsers)
- 🌳 **Collapsible tree** - Intuitive hierarchical view
- 📋 **Copy paths** - Click 📋 to copy JSONPath for any value
- 🔍 **Search** - Find keys and values instantly with highlighting
- ✓ **Validation** - Immediate feedback on JSON validity
- 📊 **Statistics** - Key count, max depth, arrays/objects count
- 🔄 **Tree/Raw toggle** - Switch between structured and raw views
- ⚡ **Expand/Collapse all** - One-click tree navigation
- 🎨 **Syntax highlighting** - Color-coded types (string, number, boolean, null)
- ⌨️ **Keyboard navigation** - Arrow keys, Enter/Space to navigate and expand tree nodes
- 🌓 **Dark/Light mode** - Toggle between themes (remembered across sessions)
- 📱 **Responsive** - Works great on desktop and mobile

## Quick Start

### Option A: Use the hosted version

Visit the [GitHub Pages deployment](https://spskelly.github.io/json-viewer/) — no install needed.

### Option B: Self-host

```bash
cd json-viewer
python3 -m http.server 8000
```
Then visit: http://localhost:8000

### Install as PWA

1. Open the app in Chrome/Edge/Brave
2. Look for the install icon in the address bar
3. Click to install

### Set as default file handler

After installing:
1. Right-click any `.json` file
2. Choose "Open with" → "Choose another app"
3. Select "JSON Viewer" from the list
4. Check "Always use this app"

Now every JSON file opens instantly with beautiful formatting!

## Features in Detail

### Collapsible Tree View
- Click any object/array header to expand/collapse
- Nested structures clearly indented
- Type indicators show `Object{n}` or `Array[n]`
- Values color-coded by type:
  - Strings: blue
  - Numbers: purple
  - Booleans: orange
  - Null: red
  - Keys: green

### Path Copying
Click the 📋 button on any key to copy its JSONPath to clipboard. Great for:
- API documentation
- Extracting specific values
- jq queries
- Programming references

Example paths:
- `users[0].name`
- `config.database.host`
- `items[3].metadata.tags[1]`

### Search
Type in the search box to:
- Find keys by name
- Find values containing text
- Automatically expands matching branches
- Highlights matches

### Validation
Invalid JSON shows immediate error message with line/position information. Valid JSON shows green checkmark.

### Statistics
Shows at-a-glance:
- Total key count
- Maximum nesting depth
- Number of arrays
- Number of objects

### Tree vs Raw View
- **Tree View**: Interactive, collapsible structure (default)
- **Raw View**: Pretty-printed JSON with syntax highlighting

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + O` | Open file |
| `Ctrl/Cmd + F` | Focus search |
| `Ctrl/Cmd + D` | Toggle dark/light mode |
| `↑` / `↓` | Navigate between tree nodes |
| `←` | Collapse node or move to parent |
| `→` | Expand node or move to first child |
| `Enter` / `Space` | Toggle expand/collapse |

## Use Cases

Perfect for:
- Inspecting API responses
- Viewing config files
- Debugging JSON data
- Exploring complex nested structures
- Quick validation checks

## Performance

- Efficient tree rendering with event delegation
- On-demand expansion (collapsed nodes skip rendering)
- Debounced search (250ms) prevents lag on large trees
- 50MB file size limit to prevent browser freezes

## Browser Support

- ✅ Chrome/Edge/Brave (full support including file handler)
- ✅ Firefox (works, but no file handler API yet)
- ✅ Safari (works, but no file handler API yet)

## Development

Files:
- `index.html` - App shell
- `app.js` - Main logic (parsing, tree building, search)
- `styles.css` - Tree styling and syntax colors
- `manifest.json` - PWA configuration
- `service-worker.js` - Offline caching

## Libraries Used

- **Native JSON.parse** - Parsing
- **Service Worker API** - Offline support
- **File Handling API** - Default file handler
- **Clipboard API** - Path copying

## Why This Exists

Opening JSON files shouldn't require:
- Opening VSCode (too heavy for quick inspections)
- Using browser dev tools (awkward for files)
- Online formatters (privacy concerns, internet required)

This gives you instant, beautiful JSON visualization with path copying and search. Double-click → done.

## Comparison to Alternatives

| Feature | JSON Viewer PWA | VSCode | Browser DevTools | Online Tools |
|---------|----------------|--------|------------------|--------------|
| Speed | ⚡ Instant | Slow start | Medium | Slow (upload) |
| Offline | ✅ | ✅ | ✅ | ❌ |
| Path Copy | ✅ | ❌ | ❌ | Sometimes |
| File Handler | ✅ | ✅ | ❌ | ❌ |
| Lightweight | ✅ | ❌ | ✅ | ✅ |

## License

MIT - do whatever you want with it

---

Built for instant JSON inspection without opening an IDE 🔧

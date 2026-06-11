# VTCD - Visual Test Critical Deploy

> 🚀 Automated screenshot testing for critical website pages

Tool for capturing and monitoring screenshots of critical website pages to ensure they remain properly configured after deployments. Provides visual regression testing with colorful CLI feedback and organized file management.

## ✨ Features

- 📸 **Sequential screenshot capturing** - Process pages one at a time with individual progress bars
- 🎨 **Beautiful CLI output** - Color-coded status, emojis, and progress indicators
- ✅ **Interactive prompts** - Review URLs before processing with `[Y/n]` confirmation
- 📝 **Smart filenames** - Auto-generated names: `YYYYMMDD_HH:MM_pagetitle-resolution.jpg`
- 🌍 **Internationalization** - Proper accent handling (é → e) and transliteration via Sluggin
- ⚡ **Modern dependencies** - Node 18+, pnpm, latest Pageres & Chrome
- 🎯 **Centralized config** - Single JSON file for baseUrl and page list

## 📋 Requirements

- **Node.js** >= 18.0.0
- **pnpm** >= 11.0.0 (or npm/yarn)
- **Chrome/Chromium** browser

## 🚀 Installation

```bash
# Install dependencies
pnpm install

# Download Chrome browser
pnpm dlx puppeteer browsers install chrome

# Run the script
node .
```

## 📁 Configuration

Edit `config/pages.json` to configure the base URL and pages to capture:

```json
{
    "baseUrl": "https://example.com",
    "pages": [
        {
            "name": "Home",
            "url": "/"
        },
        {
            "name": "Contact",
            "url": "/contact"
        },
        {
            "name": "Privacy Policy",
            "url": "/privacy"
        }
    ]
}
```

### Configuration Options

- **baseUrl** (string, required): The domain URL for capturing screenshots
- **pages** (array, required): List of pages to capture
  - **name** (string): Display name (used in CLI and converted to slug for filename)
  - **url** (string): Page path relative to baseUrl

## 📸 Output

Screenshots are saved in `screenshots/{domain}/` with the filename format:

```
YYYYMMDD_HH:MM_pagetitle-resolution.jpg
```

**Example:**
```
20260611_16:03_home-1280x1024.jpg
20260611_16:03_home-360x740.jpg
20260611_16:03_contact-1280x1024.jpg
20260611_16:03_contact-360x740.jpg
```

### Resolution Sizes

- **Mobile**: 360×740 pixels
- **Desktop**: 1280×1024 pixels

## 💡 Usage Example

```bash
$ node .

🚀 Visual Test Critical Deploy v1.0.2

──────────────────────────────────────────────────

📁 Domain: example.com
📅 Date: 20260611 16:03

📋 URLs to process (3):

  1. → Home
     https://example.com/
  2. → About
     https://example.com/about
  3. → Contact
     https://example.com/contact

──────────────────────────────────────────────────

❓ Begin processing? [Y/n]: y

──────────────────────────────────────────────────

⏳ processing Home | ████████████░░░ | 1/2
⏳ processing About | ████████████████ | 2/2
⏳ processing Contact | ████████████████ | 2/2

──────────────────────────────────────────────────

✅ Home
✅ About
✅ Contact

──────────────────────────────────────────────────

🎉 Completado!

✓ Exitosos: 3
📸 Screenshots guardados en: screenshots/example.com
```

## 📦 Dependencies

- **chalk** (^4.1.2) - Terminal colors
- **cli-progress** (^3.12.0) - Progress bars
- **pageres** (^8.1.0) - Screenshot capture
- **sluggin** (^0.4.1) - Smart URL slug generation

## 🔍 How It Works

1. **Validation** - Checks for Chrome/Chromium installation
2. **Preview** - Lists all pages to capture with full URLs
3. **Confirmation** - Prompts user to begin processing
4. **Capture** - Takes screenshots at mobile and desktop sizes
5. **Report** - Shows results with success/failure summary

## ⚙️ Advanced Configuration

### Change Chrome timeout

Edit the `delay` variable in `index.js` (default: 2 seconds):

```javascript
const delay = 2; // seconds to wait after page load
```

### Change resolutions

Edit the `resolutions` array in `index.js`:

```javascript
const resolutions = ['360x740', '1280x1024']; // Custom sizes
```

## 🐛 Troubleshooting

**Error: Chrome browser is not installed**
```bash
pnpm dlx puppeteer browsers install chrome
```

**Error: Protocol error - Connection closed**
- Page may be timing out. Increase `delay` in index.js
- Check if the URL is accessible and loads properly

**Filenames have strange characters**
- Sluggin automatically handles accents and special characters
- "Café" becomes "cafe", "José" becomes "jose"

## 📝 License

MIT - © Jorge Epuñan

## 🙋 Support

For issues or questions, check the [GitHub repository](https://github.com/juanbrujo/VTCD).


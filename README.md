# Assign Watch 📚 - Extension for LEB2

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/dedhfmakhbgeopgdipofgooiibkanfad)](https://chromewebstore.google.com/detail/dedhfmakhbgeopgdipofgooiibkanfad)
[![GitHub Release](https://img.shields.io/github/v/release/3raphat/assign-watch)](https://github.com/3raphat/assign-watch/releases/latest)
[![License](https://img.shields.io/github/license/3raphat/assign-watch)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/3raphat/assign-watch)](https://github.com/3raphat/assign-watch/stargazers)

A browser extension that enhances your LEB2 experience by providing a convenient way to view and manage all your assignments in one place.

## Features ✨

- 🔍 View all assignments across all classes in a single modal
- 📱 Toggle between grid and list views
- 🌓 Dark/Light theme support
- 🔔 Assignment notifications
- 🎯 Filter assignments by class
- 📊 Status indicators for submissions
- 📅 Due date tracking with countdown
- 🔒 Privacy-focused (all data stored locally)

## 🚀 Installation

### Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store](https://chromewebstore.google.com/detail/dedhfmakhbgeopgdipofgooiibkanfad)
2. Click "Add to Chrome"
3. Click "Add extension" in the popup

### Manual Installation

1. Download the latest release from our [Releases](https://github.com/3raphat/assign-watch/releases) page
2. Extract the downloaded ZIP file

#### Chrome

1. Navigate to `chrome://extensions`
2. Enable "Developer mode" (top-right)
3. Click "Load unpacked" and select the extracted folder

#### Firefox (Development Only)

1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from the extracted folder

## 🛠️ Development

1. Clone the repository

   ```bash
   git clone https://github.com/3raphat/assign-watch.git
   cd assign-watch
   ```

2. Install dependencies

   ```bash
   pnpm install
   ```

3. Start development server

   ```bash
   pnpm dev # For Chrome
   # or
   pnpm dev:firefox # For Firefox
   ```

4. Load the extension
   - For Chrome:
     1. Go to `chrome://extensions`
     2. Enable "Developer mode"
     3. Click "Load unpacked" and select the `.output/chrome-mv3` directory
   - For Firefox:
     1. Go to `about:debugging#/runtime/this-firefox`
     2. Click "Load Temporary Add-on"
     3. Select the `manifest.json` file from `.output/firefox-mv2` directory

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch

   ```bash
   git checkout -b feat/amazing-feature
   ```

3. Commit your changes

   ```bash
   git commit -m 'feat: add amazing new feature'
   ```

4. Push to your branch

   ```bash
   git push origin feat/amazing-feature
   ```

5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💝 Support the Project

If you find Assign Watch valuable, consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs or suggesting features
- 💻 Contributing code improvements
- 📢 Sharing with your classmates
- 📝 Writing documentation or tutorials

Your support helps make Assign Watch better for everyone!

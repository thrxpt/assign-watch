# Assign Watch 📚 - Extension for LEB2

A browser extension that enhances your LEB2 experience by providing a convenient way to view and manage all your assignments in one place.

## Features ✨

- 🔍 View all assignments across all classes in a single modal
- 📱 Toggle between grid and list views
- 🌓 Dark/Light theme support
- 🔔 Assignment notifications (Coming soon)
- 🎯 Filter assignments by class
- 📊 Status indicators for submissions
- 📅 Due date tracking with countdown

## Installation 💻

1. Download the latest release from the [Releases](https://github.com/3raphat/assign-watch/releases) page
2. Extract the zip file
3. For Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extracted folder
4. For Firefox:
   - Go to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file from the extracted folder or just the zip file
5. Click on the browser extension icon to open the Assign Watch modal

## Development 🔧

1. Clone this repository

   ```bash
   git clone https://github.com/3raphat/assign-watch.git
   cd assign-watch
   ```

2. Install dependencies and start development server

   ```bash
   # Install dependencies
   pnpm install

   # Start development server
   pnpm dev        # For Chrome
   pnpm dev:firefox # For Firefox
   ```

3. Load the extension
   - For Chrome:
     1. Go to `chrome://extensions/`
     2. Enable "Developer mode"
     3. Click "Load unpacked" and select the `.output/chrome-mv3/` directory
   - For Firefox:
     1. Go to `about:debugging#/runtime/this-firefox`
     2. Click "Load Temporary Add-on"
     3. Select the `manifest.json` file from `.output/firefox-mv2/` directory

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License 📝

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support 💖

If you find Assign Watch helpful, please consider:

- Starring the repository
- Reporting bugs or suggesting features
- Contributing to the codebase
- Sharing with your classmates

# Assign Watch - Extension for LEB2

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/dedhfmakhbgeopgdipofgooiibkanfad)](https://chromewebstore.google.com/detail/dedhfmakhbgeopgdipofgooiibkanfad)
[![GitHub Release](https://img.shields.io/github/v/release/thrxpt/assign-watch)](https://github.com/thrxpt/assign-watch/releases/latest)
[![License](https://img.shields.io/github/license/thrxpt/assign-watch)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/thrxpt/assign-watch)](https://github.com/thrxpt/assign-watch/stargazers)

A browser extension that enhances your LEB2 experience by providing a convenient way to view and manage all your assignments in one place.

> [!NOTE]
> LEB2 ย่อมาจาก Learning Environment version B2 เป็นแพลตฟอร์มด้านการศึกษาสำหรับการเรียนการสอนออนไลน์ ถูกสร้างและพัฒนาขึ้นโดยหน่วยงานพัฒนาและบูรณาการเทคโนโลยีเพื่อการศึกษา (ETS) ของมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี (มจธ.) หรือ KMUTT
> [Learn More](https://www.leb2.org/what-is-leb2)

## Features ✨

- 🔍 **Unified View**: Access all assignments across classes in a single modal
- ⚡ **Quick Access**: Instantly open with keyboard shortcut (Alt/Option + A)
- 📱 **Flexible Layout**: Toggle between grid and list views for optimal viewing
- 🌓 **Theme Support**: Seamless dark/light mode integration
- 🔔 **Notifications**: Stay updated with assignment alerts
- 🎯 **Advanced Filtering**: Easy filtering of assignments by class
- 📊 **Status Tracking**: Clear submission status indicators
- 📅 **Due Date Management**: Countdown timers for upcoming deadlines
- 🔒 **Privacy First**: All data stored locally for maximum privacy

## Installation 🚀

### Chrome Web Store

1. Visit the [Chrome Web Store](https://chromewebstore.google.com/detail/dedhfmakhbgeopgdipofgooiibkanfad)
2. Click "Add to Chrome"
3. Click "Add extension" in the popup

### Manual Installation

1. Download the latest release from our [Releases](https://github.com/thrxpt/assign-watch/releases) page
2. Extract the downloaded ZIP file (for chrome)

#### Chrome

1. Navigate to `chrome://extensions`
2. Enable "Developer mode" (top-right)
3. Click "Load unpacked" and select the extracted folder

#### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..." and select the ZIP file

> [!WARNING]
> Installing this way will only work until the browser is restarted. For a permanent installation, use the [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer) instead.

#### Firefox Developer Edition

1. Go to `about:config`
2. Set `xpinstall.signatures.required` to `false`
3. Go to `about:addons`
4. Click the gear icon and select "Install Add-on From File..." and select the ZIP file

_This reportedly works with [Firefox Extended Support Release](https://www.mozilla.org/en-US/firefox/enterprise) and [Nightly](https://www.mozilla.org/en-US/firefox/channel/desktop) as well._

## Development 🛠️

1. Clone the repository

   ```bash
   git clone https://github.com/thrxpt/assign-watch.git
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
     2. Click "Load Temporary Add-on..."
     3. Select the `manifest.json` file from `.output/firefox-mv2` directory

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch

   ```bash
   git checkout -b feat/amazing-feature
   ```

3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org)

   ```bash
   git commit -m 'feat: add amazing new feature'
   ```

4. Push to your branch

   ```bash
   git push origin feat/amazing-feature
   ```

5. Open a Pull Request

## License 📝

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support the Project 💝

If you find Assign Watch valuable, consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs or suggesting features
- 💻 Contributing code improvements
- 📢 Sharing with your classmates
- 📝 Writing documentation or tutorials

Your support helps make Assign Watch better for everyone!

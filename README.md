<div align="center">
  <img src="./assets/icon.png" />
  <h1>
    Assign Watch
  </h1>
  <p>
    View all your assignments in LEB2 in one place
  </p>
</div>

## About the Project

Assign Watch is a browser extension for [LEB2](https://www.leb2.org/what-is-leb2) that helps you view all your assignments in one place.

By default, LEB2 doesn't show all of your assignments in a single place, you need to open each class and navigate to the assignments page to view them.

## Features

- **Unified Dashboard**: View all your assignments in one place without navigating through multiple class pages.
- **Calendar View**: Visualize your workload with an interactive weekly or monthly calendar.
- **Notifications**: Get timely alerts for assignments that are due soon.
- **Customizable View**: Hide or show classes or assignments you don't want to see.
- **Quick Access**: Instantly open with keyboard shortcut (<kbd>Alt</kbd>+<kbd>A</kbd> or <kbd>Option</kbd>+<kbd>A</kbd>).
- **Multi-language**: Supports English and Thai.

## Installation

<a href="https://chromewebstore.google.com/detail/dedhfmakhbgeopgdipofgooiibkanfad">
  <picture>
    <source srcset="https://i.imgur.com/XBIE9pk.png" media="(prefers-color-scheme: dark)">
    <img height="58" src="https://i.imgur.com/oGxig2F.png" alt="Chrome Web Store">
  </picture>
</a>
<a href="https://addons.mozilla.org/firefox/addon/assign-watch">
  <picture>
    <source srcset="https://i.imgur.com/ZluoP7T.png" media="(prefers-color-scheme: dark)">
    <img height="58" src="https://i.imgur.com/4PobQqE.png" alt="Firefox add-ons">
  </picture>
</a>

### Manual Installation

1. Download the latest release from [GitHub releases](https://github.com/thrxpt/assign-watch/releases).
2. Extract the downloaded archive.

#### Chrome

1. Go to `chrome://extensions`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the extracted folder.

#### Firefox

1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select the `manifest.json` file inside the extracted folder.

> [!WARNING]
> Installing this way will only work until the browser is restarted.

## Development

To start development, follow these steps:

1. Clone the repository

   ```bash
   git clone https://github.com/thrxpt/assign-watch.git
   cd assign-watch
   ```

2. Install dependencies

   ```bash
   pnpm install
   ```

3. Run in development mode

   ```bash
   # For Chrome
   pnpm dev

   # For Firefox
   pnpm dev:firefox
   ```

4. Build for production

   ```bash
   # For Chrome
   pnpm build

   # For Firefox
   pnpm build:firefox
   ```

## Disclaimer

Assign Watch is not affiliated with LEB2 or any other educational institution. It is a third-party tool created by the community for the community.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue.

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feat/amazing-feature
```

3. Commit your changes using the [conventional commit](https://www.conventionalcommits.org) format

```bash
git add .
git commit -m "feat: amazing feature"
```

4. Push to the branch

```bash
git push origin feat/amazing-feature
```

5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you find this extension useful, please consider:

- [Starring the repository on GitHub](https://github.com/thrxpt/assign-watch)
- [Sponsoring me on GitHub](https://github.com/sponsors/thrxpt)
- Sharing it with your friends!

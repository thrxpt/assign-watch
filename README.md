<div align="center">
  <img src="./assets/icon.png" width="64" height="64"/>
  <h1>
    Assign Watch
  </h1>
  <p>
    View all your assignments in LEB2 in one place
  </p>
</div>

## About the Project

**Assign Watch** is a browser extension designed for the [LEB2](https://www.leb2.org/what-is-leb2) educational platform.

### The Problem

By default, LEB2 requires students to navigate individual class pages to view assignments, making it time-consuming to get a complete overview of your workload.

### The Solution

Assign Watch aggregates all your assignments across courses, providing instant visibility into your academic commitments with an intuitive, feature-rich interface.

## Features

- **Unified Dashboard:** View all assignments across courses in one place
- **Calendar View:** Visualize your workload with an interactive weekly or monthly calendar.
- **Notifications:** Get timely alerts for assignments that are due soon
- **Customizable View:** Hide or show classes or assignments you don't want to see.
- **Quick Access:** Instantly open with keyboard shortcut (<kbd>Alt</kbd>+<kbd>A</kbd> or <kbd>Option</kbd>+<kbd>A</kbd>).
- **Multi-language Support:** Available in English and Thai.

## Installation

### Store Installation (Recommended)

<a href="https://chromewebstore.google.com/detail/dedhfmakhbgeopgdipofgooiibkanfad">
  <picture>
    <source srcset="https://i.imgur.com/XBIE9pk.png" media="(prefers-color-scheme: dark)">
    <img height="58" src="https://i.imgur.com/oGxig2F.png" alt="Chrome Web Store"></picture></a>
<a href="https://addons.mozilla.org/firefox/addon/assign-watch">
  <picture>
    <source srcset="https://i.imgur.com/ZluoP7T.png" media="(prefers-color-scheme: dark)">
    <img height="58" src="https://i.imgur.com/4PobQqE.png" alt="Firefox add-ons"></picture></a>

### Manual Installation

#### Prerequisites

Download the latest release from the [GitHub Releases](https://github.com/thrxpt/assign-watch/releases) page and extract the archive.

#### For Chrome

1. Navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the extracted folder.

#### For Firefox

1. Navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select the `manifest.json` file inside the extracted folder.

> [!WARNING]
> **Firefox Limitation:** Extensions installed via "Load Temporary Add-on" will be removed when you close or restart Firefox. For permanent usage, please install via the Firefox Add-ons store link above.
> Extensions installed manually in Firefox will be removed when the browser is restarted.

## Development

### Prerequisites

- [Node.js](https://nodejs.org) (LTS recommended)
- [pnpm](https://pnpm.io)

### Setup

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

## Contributing

Contributions are welcome and appreciated! Whether you're fixing bugs, adding features, or improving documentation, your help makes Assign Watch better for everyone.

### How to Contribute

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feat/your-amazing-feature
```

3. Commit your changes using the [Conventional Commits](https://www.conventionalcommits.org) format

```bash
git add .
git commit -m "feat: add your amazing feature"
```

4. Push to your fork

```bash
git push origin feat/your-amazing-feature
```

5. Open a Pull Request with a clear description of your changes

### Reporting Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/thrxpt/assign-watch/issues/new) with as much detail as possible.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

If you find Assign Watch helpful, please consider supporting the project:

- [Star the repository](https://github.com/thrxpt/assign-watch) on GitHub
- [Sponsor the developer](https://github.com/sponsors/thrxpt)
- Share it with classmates and friends who use LEB2

## Disclaimer

Assign Watch is **not affiliated with LEB2** or any other educational institution. It is a third-party tool created by the community for the community.

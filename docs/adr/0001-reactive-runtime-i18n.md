# 0001. Reactive Runtime I18n

Assign Watch supports English and Thai, with user-configurable language preferences (`auto`, `en`, `th`). The WebExtension platform API (`chrome.i18n.getMessage`) binds strictly to the browser's application locale and does not support switching languages at runtime. To allow users to switch languages dynamically without requiring a browser restart or page reload, we bundle typed message dictionaries and provide an `I18nProvider` backed by persistent extension storage (`languageStorage`).

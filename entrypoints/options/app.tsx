import {
  BrushCleaning,
  Heart,
  Keyboard,
  Languages,
  Link,
  Settings,
} from "lucide-react";
import { useState } from "react";

import { browser } from "#imports";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Language } from "@/lib/preferences";
import { clearAllHiddenItems } from "@/lib/storage";
import { I18nProvider, useI18n } from "@/lib/use-i18n";

const SHORTCUT_KEYS = [/Mac/u.test(navigator.userAgent) ? "⌥" : "Alt", "A"];
const KBD_CLASS =
  "border shadow-[0_1px_0_0_var(--border)] text-[10px] h-4 min-w-4 mb-0.5";

function isLanguage(val: string): val is Language {
  return val === "auto" || val === "en" || val === "th";
}

function OptionsContent() {
  const { language, setLanguage, t } = useI18n();
  const [cleared, setCleared] = useState(false);

  const handleClearHidden = async () => {
    await clearAllHiddenItems();
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  return (
    <div className="flex min-h-screen justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <img
            alt="Assign Watch Logo"
            className="size-10"
            height={40}
            src={browser.runtime.getURL("/icons/128.png")}
            width={40}
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-lg tracking-tight">
                Assign Watch
              </h1>
              <span className="rounded-full border bg-secondary px-2 py-0.5 font-medium text-secondary-foreground text-xs">
                v{browser.runtime.getManifest().version}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">{t("settings")}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Languages className="size-4 text-muted-foreground" />
                  <span>{t("language")}</span>
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  {t("language_desc")}
                </p>
              </div>
              <Tabs
                onValueChange={(val) => {
                  if (isLanguage(val)) {
                    setLanguage(val);
                  }
                }}
                value={language}
              >
                <TabsList className="h-8">
                  <TabsTrigger className="text-xs" value="auto">
                    {t("language_auto")}
                  </TabsTrigger>
                  <TabsTrigger className="text-xs" value="en">
                    {t("language_en")}
                  </TabsTrigger>
                  <TabsTrigger className="text-xs" value="th">
                    {t("language_th")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Keyboard className="size-4 text-muted-foreground" />
              <span>{t("keyboard_shortcut")}</span>
            </div>
            <p className="mt-1 text-muted-foreground text-xs">
              {t("keyboard_shortcut_desc")}
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs">
              <span>{t("shortcut")}:</span>
              <KbdGroup className="mx-1">
                {SHORTCUT_KEYS.map((key) => (
                  <Kbd className={KBD_CLASS} key={key}>
                    {key}
                  </Kbd>
                ))}
              </KbdGroup>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Settings className="size-4 text-muted-foreground" />
                  <span>{t("hidden_items")}</span>
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  {t("hidden_items_desc")}
                </p>
              </div>
              <Button
                disabled={cleared}
                onClick={handleClearHidden}
                size="sm"
                variant="outline"
              >
                <BrushCleaning className="size-3.5" />
                <span>{cleared ? t("cleared") : t("clear_all")}</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4 text-xs">
          <a
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
            href="https://app.leb2.org"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Link className="size-3.5" />
            <span>LEB2</span>
          </a>
          <a
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
            href="https://github.com/thrxpt/assign-watch"
            rel="noopener noreferrer"
            target="_blank"
          >
            <svg
              aria-hidden="true"
              className="size-3.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                fill="currentColor"
              />
            </svg>
            <span>GitHub</span>
          </a>
          <a
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
            href="https://github.com/sponsors/thrxpt"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Heart className="size-3.5" />
            <span>{t("sponsor")}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <OptionsContent />
    </I18nProvider>
  );
}

export default App;

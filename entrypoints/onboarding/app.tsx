import { Bell, BookCheck, ChevronRight, Languages } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { browser } from "wxt/browser";

import { buttonVariants } from "@/components/ui/button";
import type { TranslationKey } from "@/lib/i18n";
import { I18nProvider, useI18n } from "@/lib/use-i18n";
import { cn } from "@/lib/utils";

const features: {
  icon: LucideIcon;
  key: TranslationKey;
}[] = [
  {
    icon: BookCheck,
    key: "onboarding_feature_track",
  },
  {
    icon: Bell,
    key: "onboarding_feature_notify",
  },
  {
    icon: Languages,
    key: "onboarding_feature_language",
  },
];

function OnboardingContent() {
  const { locale, t } = useI18n();

  useEffect(() => {
    document.title = t("onboarding_page_title");
    document.documentElement.lang = locale;
  }, [locale, t]);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center text-center">
        <img
          alt="Assign Watch"
          className="mb-6 size-20"
          height={80}
          src={browser.runtime.getURL("/icons/128.png")}
          width={80}
        />
        <h1 className="mb-2 font-semibold text-2xl tracking-tight">
          {t("onboarding_title")}
        </h1>
        <p className="mb-8 text-base text-muted-foreground">
          {t("onboarding_subtitle")}
        </p>

        <div className="mx-auto mb-8 space-y-3">
          {features.map((feature) => (
            <div
              className="flex items-center gap-3 rounded-lg bg-card/50 p-3 text-left text-sm"
              key={feature.key}
            >
              <div className="rounded-lg bg-muted p-2">
                <feature.icon className="size-5 shrink-0" />
              </div>
              <span>{t(feature.key)}</span>
            </div>
          ))}
        </div>

        <a
          className={cn(
            buttonVariants({ size: "lg" }),
            "group relative h-10 overflow-hidden"
          )}
          href="https://app.leb2.org/class"
          rel="noopener noreferrer"
          target="_blank"
        >
          <span className="mr-8 text-primary-foreground transition-opacity duration-500 group-hover:opacity-0">
            {t("onboarding_get_started")}
          </span>
          <span className="absolute top-1 right-1 bottom-1 z-10 grid w-1/4 place-items-center rounded-sm bg-primary-foreground/15 transition-all duration-500 group-hover:w-[calc(100%-0.5rem)] group-active:scale-95">
            <ChevronRight className="size-4 stroke-primary-foreground" />
          </span>
        </a>

        <p className="mt-4 text-muted-foreground text-xs">
          {t("onboarding_footer_hint")}
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <OnboardingContent />
    </I18nProvider>
  );
}

export default App;

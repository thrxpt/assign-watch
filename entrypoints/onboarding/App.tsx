import {
  Bell,
  BookCheck,
  ChevronRight,
  Languages,
  LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const features: {
  icon: LucideIcon;
  text: string;
}[] = [
  {
    icon: BookCheck,
    text: "Track all your assignments in one place",
  },
  {
    icon: Bell,
    text: "Get notified before deadlines",
  },
  {
    icon: Languages,
    text: "English & Thai language support",
  },
];

function App() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center text-center">
        <img
          src={browser.runtime.getURL("/icons/128.png")}
          alt="Assign Watch"
          className="mb-6 size-20 rounded-2xl shadow-lg"
        />
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Thank you for installing Assign Watch!
        </h1>
        <p className="mb-8 text-base text-muted-foreground">
          Your personal assignment tracker for LEB2
        </p>

        <div className="mx-auto mb-8 space-y-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg bg-card/50 p-3 text-left text-sm"
            >
              <div className="rounded-lg bg-muted p-2">
                <feature.icon className="size-5 shrink-0" />
              </div>
              <span>{feature.text}</span>
            </div>
          ))}
        </div>

        <a
          href="https://app.leb2.org/class"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ size: "lg" }),
            "group relative overflow-hidden",
          )}
        >
          <span className="mr-8 text-primary-foreground transition-opacity duration-500 group-hover:opacity-0">
            Get Started
          </span>
          <span className="absolute top-1 right-1 bottom-1 z-10 grid w-1/4 place-items-center rounded-sm bg-primary-foreground/15 transition-all duration-500 group-hover:w-[calc(100%-0.5rem)] group-active:scale-95">
            <ChevronRight className="size-4 stroke-primary-foreground" />
          </span>
        </a>

        <p className="mt-4 text-xs text-muted-foreground">
          Visit LEB2 to see something special ✨
        </p>
      </div>
    </div>
  );
}

export default App;

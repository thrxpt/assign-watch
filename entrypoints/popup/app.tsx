import { useEffect, useState } from "react"
import {
  BellRing,
  CalendarClock,
  Coffee,
  Link,
  ListCollapse,
} from "lucide-react"
import { storage } from "wxt/storage"
import { z } from "zod"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

const settingSchema = z.object({
  notificationsEnabled: z.boolean().default(true),
  reminderTime: z.enum(["24", "48", "72", "120", "168"]).default("72"),
  compactMode: z.boolean().default(false),
})

type Setting = z.infer<typeof settingSchema>

function App() {
  const [settings, setSettings] = useState<Setting>({
    notificationsEnabled: true,
    reminderTime: "72",
    compactMode: false,
  })

  useEffect(() => {
    const loadSettings = async () => {
      const notificationsEnabled = await storage.getItem<boolean>(
        "sync:notifications:enabled"
      )
      const reminderTime = await storage.getItem<string>(
        "sync:notifications:reminderTime"
      )
      const compactMode = await storage.getItem<boolean>("sync:compactMode")

      const parsedSettings = await settingSchema.parseAsync({
        notificationsEnabled: notificationsEnabled ?? true,
        reminderTime: reminderTime ?? "72",
        compactMode: compactMode ?? false,
      })
      setSettings(parsedSettings)
    }

    loadSettings()
  }, [])

  const updateSetting = async (key: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    const storageKey =
      key === "notificationsEnabled"
        ? "sync:notifications:enabled"
        : key === "reminderTime"
          ? "sync:notifications:reminderTime"
          : "sync:compactMode"
    await storage.setItem(storageKey, value)
  }

  const handleNotificationToggle = async () => {
    const newState = !settings.notificationsEnabled

    if (newState) {
      const permission = await browser.permissions.request({
        permissions: ["notifications"],
      })
      if (!permission) {
        return updateSetting("notificationsEnabled", false)
      }
    }

    updateSetting("notificationsEnabled", newState)
  }

  const handleCompactModeToggle = async () => {
    const newState = !settings.compactMode
    updateSetting("compactMode", newState)
  }

  return (
    <div className="mx-auto w-full min-w-[400px] max-w-xl space-y-6 p-6 font-['Anuphan_Variable']">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
        Settings
        <span className="font-normal text-gray-600"> / การตั้งค่า</span>
      </h1>

      <div className="space-y-4">
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="notifications" className="flex items-start space-x-2">
            <BellRing className="size-4 shrink-0 text-gray-500 dark:text-gray-400 sm:size-5" />
            <div className="flex flex-col space-y-1">
              <span>Notifications</span>
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 sm:text-sm">
                Get notified before due date
              </span>
            </div>
          </Label>
          <Switch
            id="notifications"
            checked={settings.notificationsEnabled}
            onCheckedChange={handleNotificationToggle}
          />
        </div>
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="reminderTime" className="flex items-start space-x-2">
            <CalendarClock className="size-4 shrink-0 text-gray-500 dark:text-gray-400 sm:size-5" />
            <div className="flex flex-col space-y-1">
              <span>Remind me</span>
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 sm:text-sm">
                Before due date
              </span>
            </div>
          </Label>

          <Select
            disabled={!settings.notificationsEnabled}
            onValueChange={(value) => updateSetting("reminderTime", value)}
            value={settings.reminderTime}
          >
            <SelectTrigger
              id="reminderTime"
              className="w-auto min-w-48 max-w-full"
            >
              <SelectValue placeholder="Select a reminder time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">1 day before</SelectItem>
              <SelectItem value="48">2 days before</SelectItem>
              <SelectItem value="72">3 days before</SelectItem>
              <SelectItem value="120">5 days before</SelectItem>
              <SelectItem value="168">1 week before</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="compactMode" className="flex items-start space-x-2">
            <ListCollapse className="size-4 shrink-0 text-gray-500 dark:text-gray-400 sm:size-5" />
            <div className="flex flex-col space-y-1">
              <span>Compact mode</span>
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 sm:text-sm">
                Show only classes that have assignments
              </span>
            </div>
          </Label>
          <Switch
            id="compactMode"
            checked={settings.compactMode}
            onCheckedChange={handleCompactModeToggle}
          />
        </div>
      </div>

      <footer className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          <a
            href="https://app.leb2.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-50 sm:px-3 sm:py-1.5"
          >
            <Link className="size-3.5 sm:size-4" />
            <span>LEB2</span>
          </a>
          <a
            href="https://github.com/3raphat/assign-watch"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-50 sm:px-3 sm:py-1.5"
          >
            <svg
              viewBox="0 0 256 250"
              width="256"
              height="250"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid"
              className="size-3.5 sm:size-4"
            >
              <path d="M128.001 0C57.317 0 0 57.307 0 128.001c0 56.554 36.676 104.535 87.535 121.46 6.397 1.185 8.746-2.777 8.746-6.158 0-3.052-.12-13.135-.174-23.83-35.61 7.742-43.124-15.103-43.124-15.103-5.823-14.795-14.213-18.73-14.213-18.73-11.613-7.944.876-7.78.876-7.78 12.853.902 19.621 13.19 19.621 13.19 11.417 19.568 29.945 13.911 37.249 10.64 1.149-8.272 4.466-13.92 8.127-17.116-28.431-3.236-58.318-14.212-58.318-63.258 0-13.975 5-25.394 13.188-34.358-1.329-3.224-5.71-16.242 1.24-33.874 0 0 10.749-3.44 35.21 13.121 10.21-2.836 21.16-4.258 32.038-4.307 10.878.049 21.837 1.47 32.066 4.307 24.431-16.56 35.165-13.12 35.165-13.12 6.967 17.63 2.584 30.65 1.255 33.873 8.207 8.964 13.173 20.383 13.173 34.358 0 49.163-29.944 59.988-58.447 63.157 4.591 3.972 8.682 11.762 8.682 23.704 0 17.126-.148 30.91-.148 35.126 0 3.407 2.304 7.398 8.792 6.14C219.37 232.5 256 184.537 256 128.002 256 57.307 198.691 0 128.001 0Z" />
            </svg>
            <span>GitHub</span>
          </a>
          <a
            href="https://ko-fi.com/3raphat"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-50 sm:px-3 sm:py-1.5"
          >
            <Coffee className="size-3.5 sm:size-4" />
            <span>Ko-fi</span>
          </a>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-medium">Assign Watch</span>
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium dark:bg-gray-800">
            v{browser.runtime.getManifest().version}
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App

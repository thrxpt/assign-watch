import { useEffect, useState } from "react"
import { BellRing, CalendarClock } from "lucide-react"
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
  notificationsEnabled: z.boolean().default(false),
  reminderTime: z.enum(["6", "12", "24", "48", "72", "168"]).default("72"),
})

type Setting = z.infer<typeof settingSchema>

function App() {
  const [settings, setSettings] = useState<Setting>({
    notificationsEnabled: false,
    reminderTime: "72",
  })

  useEffect(() => {
    const loadSettings = async () => {
      const notificationsEnabled = await storage.getItem<boolean>(
        "sync:notifications:enabled"
      )
      const reminderTime = await storage.getItem<string>(
        "sync:notifications:reminderTime"
      )

      const parsedSettings = await settingSchema.parseAsync({
        notificationsEnabled: notificationsEnabled ?? false,
        reminderTime: reminderTime ?? "72",
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
        : "sync:notifications:reminderTime"
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

  return (
    <div className="mx-auto w-full min-w-[400px] max-w-xl space-y-6 p-6 font-['Anuphan_Variable']">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
        Settings
        <span className="font-normal text-gray-600"> / การตั้งค่า</span>
      </h1>

      <div className="space-y-4">
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="notifications" className="flex items-start space-x-2">
            <BellRing className="size-4 text-gray-500 dark:text-gray-400 sm:size-5" />
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
            <CalendarClock className="size-4 text-gray-500 dark:text-gray-400 sm:size-5" />
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
              <SelectItem value="6">6 hours before</SelectItem>
              <SelectItem value="12">12 hours before</SelectItem>
              <SelectItem value="24">1 day before</SelectItem>
              <SelectItem value="48">2 days before</SelectItem>
              <SelectItem value="72">3 days before</SelectItem>
              <SelectItem value="120">5 days before</SelectItem>
              <SelectItem value="168">1 week before</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

export default App

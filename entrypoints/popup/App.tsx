import { useEffect, useState } from "react"
import { storage } from "wxt/storage"

function App() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState("24")

  useEffect(() => {
    const loadSettings = async () => {
      const enabled = await storage.getItem<boolean>(
        "local:notifications:enabled"
      )
      const time = await storage.getItem<string>(
        "local:notifications:reminderTime"
      )
      setNotificationsEnabled(enabled ?? false)
      setReminderTime(time ?? "24")
    }
    loadSettings()
  }, [])

  const handleNotificationToggle = async () => {
    const newState = !notificationsEnabled
    setNotificationsEnabled(newState)
    await storage.setItem("local:notifications:enabled", newState)

    if (newState) {
      const permission = await browser.permissions.request({
        permissions: ["notifications"],
      })
      if (!permission) {
        setNotificationsEnabled(false)
        await storage.setItem("local:notifications:enabled", false)
      }
    }
  }

  const handleReminderTimeChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newTime = e.target.value
    setReminderTime(newTime)
    await storage.setItem("local:notifications:reminderTime", newTime)
  }

  return (
    <div className="settings-container">
      <h1>LEB2 Enhance Settings</h1>

      <div className="setting-group">
        <h2>Notifications (Coming soon)</h2>
        <div className="setting-item">
          <label className="switch">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={handleNotificationToggle}
            />
            <span className="slider"></span>
          </label>
          <span>Enable assignment reminders</span>
        </div>

        <div className="setting-item">
          <label htmlFor="reminderTime">Remind me before due date:</label>
          <select
            id="reminderTime"
            value={reminderTime}
            onChange={handleReminderTimeChange}
            disabled={!notificationsEnabled}
          >
            <option value="24">24 hours</option>
            <option value="48">48 hours</option>
            <option value="72">72 hours</option>
          </select>
        </div>
      </div>

      <p className="info-text">
        Notifications will remind you about upcoming assignment deadlines
      </p>
    </div>
  )
}

export default App

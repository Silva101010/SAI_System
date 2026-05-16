import Dock from "@/components/ui/dock";
import {
  Home,
  Search,
  Bell,
  Settings,
  User,
} from "lucide-react"
import { toast } from "sonner"

export default function DockDemo() {
  const dockItems = [
    { icon: Home, label: "Home", onClick: () => toast.info("Home clicked") },
    { icon: Search, label: "Search", onClick: () => toast.info("Search clicked") },
    { icon: Bell, label: "Notifications", onClick: () => toast.info("Notifications clicked") },
    { icon: User, label: "Profile", onClick: () => toast.info("Profile clicked") },
    { icon: Settings, label: "Settings", onClick: () => toast.info("Settings clicked") },
  ]

  return <Dock items={dockItems} />
}

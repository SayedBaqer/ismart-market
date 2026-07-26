import { Instagram, BarChart3 } from 'lucide-react'

// Maps Plugin.icon (a lucide export name stored as plain text) to the actual component.
export const PLUGIN_ICONS: Record<string, typeof Instagram> = { Instagram, BarChart3 }

export interface ShopPluginStatus {
  slug: string
  name: string
  icon: string | null
  minPlan: string
  locked: boolean
  enabled: boolean
}

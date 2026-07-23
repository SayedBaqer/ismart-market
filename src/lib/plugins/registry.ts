import { HookRegistry } from './hooks'
import type { PluginDefinition, HookSystem } from './types'

class PluginRegistry {
  private plugins = new Map<string, PluginDefinition>()
  private activePlugins = new Set<string>()
  readonly hooks: HookSystem = new HookRegistry()

  /** Register a plugin definition (does not activate it). */
  register(plugin: PluginDefinition): void {
    this.plugins.set(plugin.slug, plugin)
  }

  /** Activate a registered plugin — calls register() and onActivate(). */
  async activate(slug: string): Promise<void> {
    const plugin = this.plugins.get(slug)
    if (!plugin) throw new Error(`Plugin "${slug}" is not registered`)
    if (this.activePlugins.has(slug)) return
    await plugin.register(this.hooks)
    await plugin.onActivate?.()
    this.activePlugins.add(slug)
  }

  async deactivate(slug: string): Promise<void> {
    const plugin = this.plugins.get(slug)
    if (!plugin) return
    await plugin.onDeactivate?.()
    this.hooks.removeAll(slug) // plugins should use their slug as a namespace prefix
    this.activePlugins.delete(slug)
  }

  isActive(slug: string): boolean {
    return this.activePlugins.has(slug)
  }

  list(): { slug: string; name: string; version: string; active: boolean }[] {
    return Array.from(this.plugins.values()).map((p) => ({
      slug: p.slug,
      name: p.name,
      version: p.version,
      active: this.activePlugins.has(p.slug),
    }))
  }
}

// Singleton — safe in Next.js server context (module cached per process)
const globalForRegistry = globalThis as unknown as { pluginRegistry: PluginRegistry }

export const pluginRegistry =
  globalForRegistry.pluginRegistry ?? new PluginRegistry()

if (process.env.NODE_ENV !== 'production') {
  globalForRegistry.pluginRegistry = pluginRegistry
}

export function definePlugin(def: PluginDefinition): PluginDefinition {
  return def
}

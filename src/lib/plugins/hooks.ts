import type { ActionHandler, FilterHandler, HookSystem } from './types'

type Entry<T> = { handler: T; priority: number }

export class HookRegistry implements HookSystem {
  private actions = new Map<string, Entry<ActionHandler>[]>()
  private filters = new Map<string, Entry<FilterHandler>[]>()

  addAction<T = unknown>(hook: string, handler: ActionHandler<T>, priority = 10): void {
    const list = this.actions.get(hook) ?? []
    list.push({ handler: handler as ActionHandler, priority })
    list.sort((a, b) => a.priority - b.priority)
    this.actions.set(hook, list)
  }

  addFilter<T = unknown>(hook: string, handler: FilterHandler<T>, priority = 10): void {
    const list = this.filters.get(hook) ?? []
    list.push({ handler: handler as FilterHandler, priority })
    list.sort((a, b) => a.priority - b.priority)
    this.filters.set(hook, list)
  }

  async doAction<T = unknown>(hook: string, payload?: T): Promise<void> {
    const list = this.actions.get(hook) ?? []
    for (const { handler } of list) {
      await handler(payload)
    }
  }

  async applyFilter<T = unknown>(hook: string, value: T): Promise<T> {
    const list = this.filters.get(hook) ?? []
    let current: unknown = value
    for (const { handler } of list) {
      current = await handler(current)
    }
    return current as T
  }

  removeAll(hook: string): void {
    this.actions.delete(hook)
    this.filters.delete(hook)
  }
}

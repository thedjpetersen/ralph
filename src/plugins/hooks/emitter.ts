/**
 * Event Emitter
 * Typed event emitter for Ralph lifecycle events
 */

import type { RalphEvents, TypedEventEmitter, EventHandler, HookDecision } from '../../core/events.js';
import type { ExecutionContext } from '../../core/context.js';
import type { HookPlugin, HookRegistration } from './types.js';

// ============================================================================
// Ralph Event Emitter
// ============================================================================

export class RalphEventEmitter implements TypedEventEmitter {
  private handlers: Map<keyof RalphEvents, Set<EventHandler<unknown>>> = new Map();
  private hooks: HookRegistration[] = [];
  private ctx: ExecutionContext | null = null;

  /**
   * Set the execution context for hooks
   */
  setContext(ctx: ExecutionContext): void {
    this.ctx = ctx;
  }

  /**
   * Register a hook plugin
   */
  registerHook(plugin: HookPlugin): void {
    const registration: HookRegistration = {
      plugin,
      events: new Set(plugin.metadata.events),
      priority: plugin.metadata.priority,
    };

    this.hooks.push(registration);

    // Sort hooks by priority
    this.hooks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Unregister a hook plugin
   */
  unregisterHook(pluginName: string): boolean {
    const index = this.hooks.findIndex(h => h.plugin.metadata.name === pluginName);
    if (index >= 0) {
      this.hooks.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Emit an event to all subscribers
   */
  emit<K extends keyof RalphEvents>(event: K, data: RalphEvents[K]): void {
    // Call direct handlers
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      }
    }

    // Call registered hooks (non-blocking)
    this.callHooksAsync(event, data);
  }

  /**
   * Emit an event and wait for all blocking hooks
   * Returns a decision if any hook blocks
   */
  async emitBlocking<K extends keyof RalphEvents>(
    event: K,
    data: RalphEvents[K]
  ): Promise<HookDecision | undefined> {
    if (!this.ctx) {
      console.warn('No execution context set for hooks');
      return undefined;
    }

    // Find blocking hooks for this event
    const blockingHooks = this.hooks.filter(
      h => h.events.has(event) && h.plugin.metadata.blocking
    );

    for (const registration of blockingHooks) {
      try {
        const decision = await registration.plugin.handle(this.ctx, event, data);
        if (decision && !decision.continue) {
          return decision;
        }
      } catch (error) {
        console.error(`Error in blocking hook ${registration.plugin.metadata.name}:`, error);
        // Continue with other hooks on error
      }
    }

    return undefined;
  }

  /**
   * Subscribe to an event
   */
  on<K extends keyof RalphEvents>(event: K, handler: EventHandler<RalphEvents[K]>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof RalphEvents>(event: K, handler: EventHandler<RalphEvents[K]>): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler<unknown>);
    }
  }

  /**
   * Subscribe to an event for one occurrence
   */
  once<K extends keyof RalphEvents>(event: K, handler: EventHandler<RalphEvents[K]>): void {
    const wrapper: EventHandler<RalphEvents[K]> = (data) => {
      this.off(event, wrapper);
      handler(data);
    };
    this.on(event, wrapper);
  }

  /**
   * Remove all handlers for an event
   */
  removeAllListeners(event?: keyof RalphEvents): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Get the number of handlers for an event
   */
  listenerCount(event: keyof RalphEvents): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  /**
   * Call hooks asynchronously (fire and forget)
   */
  private callHooksAsync<K extends keyof RalphEvents>(event: K, data: RalphEvents[K]): void {
    if (!this.ctx) return;

    const relevantHooks = this.hooks.filter(
      h => h.events.has(event) && !h.plugin.metadata.blocking
    );

    for (const registration of relevantHooks) {
      // Fire and forget
      registration.plugin.handle(this.ctx, event, data).catch(error => {
        console.error(`Error in hook ${registration.plugin.metadata.name}:`, error);
      });
    }
  }
}

// ============================================================================
// Global Event Emitter Instance
// ============================================================================

export const eventEmitter = new RalphEventEmitter();

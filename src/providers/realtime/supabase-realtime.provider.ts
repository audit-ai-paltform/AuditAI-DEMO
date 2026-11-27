import { RealtimeChannel } from '@supabase/supabase-js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { logger } from '../../core/config/logger.config.js';
import { RealtimeException } from '../../core/exceptions/database.exception.js';

export interface IRealtimeProvider {
  createChannel(channelName: string): RealtimeChannel;
  broadcastEvent(channelName: string, eventName: string, payload: Record<string, unknown>): Promise<void>;
  removeChannel(channelName: string): Promise<void>;
}

export class SupabaseRealtimeProvider implements IRealtimeProvider {
  private readonly activeChannels: Map<string, RealtimeChannel> = new Map();

  /**
   * Instantiates or retrieves a Supabase Realtime channel instance.
   */
  public createChannel(channelName: string): RealtimeChannel {
    const existingChannel = this.activeChannels.get(channelName);
    if (existingChannel) {
      return existingChannel;
    }

    logger.info({ channelName }, 'Creating new Supabase Realtime channel...');
    const channel = supabaseAdminClient.channel(channelName);
    this.activeChannels.set(channelName, channel);
    return channel;
  }

  /**
   * Broadcasts a real-time event payload to all connected clients on a given channel.
   */
  public async broadcastEvent(channelName: string, eventName: string, payload: Record<string, unknown>): Promise<void> {
    logger.info({ channelName, eventName }, 'Broadcasting event via Supabase Realtime...');

    try {
      const channel = this.createChannel(channelName);

      const status = await channel.send({
        type: 'broadcast',
        event: eventName,
        payload,
      });

      if (status === 'error') {
        logger.error({ channelName, eventName }, 'Supabase Realtime broadcast returned error status');
        throw new RealtimeException(`Realtime broadcast failed on channel '${channelName}'`);
      }

      logger.info({ channelName, eventName, status }, 'Supabase Realtime event broadcasted successfully');
    } catch (err: unknown) {
      if (err instanceof RealtimeException) throw err;
      const message = err instanceof Error ? err.message : 'Unknown realtime broadcast error';
      logger.error({ err, channelName, eventName }, 'Supabase Realtime broadcast exception');
      throw new RealtimeException(`Realtime broadcast exception: ${message}`);
    }
  }

  /**
   * Unsubscribes and cleans up a Supabase Realtime channel.
   */
  public async removeChannel(channelName: string): Promise<void> {
    const channel = this.activeChannels.get(channelName);
    if (!channel) return;

    logger.info({ channelName }, 'Removing Supabase Realtime channel...');
    try {
      await supabaseAdminClient.removeChannel(channel);
      this.activeChannels.delete(channelName);
      logger.info({ channelName }, 'Supabase Realtime channel removed successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown channel removal error';
      logger.error({ err, channelName }, 'Failed to remove Supabase Realtime channel');
      throw new RealtimeException(`Failed to remove channel '${channelName}': ${message}`);
    }
  }

  // Alias method for backward compatibility
  public async broadcastCallEvent(tenantId: string, eventName: string, payload: Record<string, unknown>): Promise<void> {
    const channelName = `tenant:${tenantId}:calls`;
    return this.broadcastEvent(channelName, eventName, payload);
  }
}

export const supabaseRealtimeProvider = new SupabaseRealtimeProvider();

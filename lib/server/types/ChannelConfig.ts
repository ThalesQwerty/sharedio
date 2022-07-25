import { Server, Channel } from "../../sharedio";

export interface ChannelConfig<ChanenlType extends Channel = Channel> {
    /**
     * Which server is this channel from?
     */
    server: Server,

    /**
     * How many times per second the channel syncronize its entities' state with the users?
     *
     * Default is 64, maximum is 1000.
     */
    syncRate?: number,

    /**
     * Determines if this is a "real" channel or just a dummy for internal testing/mocking purposes.
     *
     * Do NOT set this attribute to true unless you're 100% absolutely sure of what you're doing.
     */
    dummy?: boolean
}

export type ChannelConstructor<ChannelType extends Channel> = new (config: ChannelConfig<ChannelType>) => ChannelType;
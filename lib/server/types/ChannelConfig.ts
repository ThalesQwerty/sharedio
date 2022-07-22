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
    syncRate?: number
}

export type ChannelConstructor<ChannelType extends Channel> = new (config: ChannelConfig<ChannelType>) => ChannelType;
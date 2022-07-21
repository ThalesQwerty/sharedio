import { Server, Channel } from "../../sharedio";

export interface ChannelConfig<ChanenlType extends Channel = Channel> {
    server: Server,
    // syncRate?: number
}

export type ChannelConstructor<ChannelType extends Channel> = new (config: ChannelConfig<ChannelType>) => ChannelType;
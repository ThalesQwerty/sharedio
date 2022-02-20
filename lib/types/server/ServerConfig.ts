import { KeyValue } from "..";

export interface ServerConfig {
    debug?: boolean;
    port?: number;
    wsOptions?: KeyValue;

    /**
     * How many ticks will happen per second (default is 64)
     */
    tickRate?: number;
}
import { KeyValue } from "..";

export interface ServerConfig {
    debug?: boolean;
    port?: number;
    wsOptions?: KeyValue;

    /**
     * How many ticks will happen per second (default is 64)
     */
    tickRate?: number;

    /**
     * Where the client schema should be generated
     */
    clientSchemaPath?: string;

    /**
     * The name of the client schema file to be generated (default is "schema.ts")
     */
    clientSchemaName?: `${string}.ts`
}
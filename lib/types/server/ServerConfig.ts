import { KeyValue } from "..";
import { Channel, SharedChannel } from "../../schema";

export interface ClientSchemaConfig {
    /**
     * Where the client schema should be generated (default is ".")
     */
    path?: string;

    /**
     * The name of the client schema file to be generated (default is "schema.ts")
     */
    fileName?: `${string}.ts`;

    /**
     * The name of the schema interface (default is "Schema")
     */
    interfaceName?: string;
}

export interface ServerConfig {
    debug?: boolean;
    port?: number;

    /**
     * The main channel of a server is the first channel every user joins automatically when they connect to the server. All entities on the server belong directly or indirectly to the main channel.
     */
    mainChannel?: typeof Channel,
    wsOptions?: KeyValue;

    /**
     * How many ticks will happen per second (default is 64)
     */
    tickRate?: number;

    clientSchema?: ClientSchemaConfig;

    dummy?: boolean;
}

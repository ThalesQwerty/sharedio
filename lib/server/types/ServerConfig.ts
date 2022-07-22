import { Channel } from "../../sharedio";
import { KeyValue } from "../../sharedio";

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
    wsOptions?: KeyValue;
    
    clientSchema?: ClientSchemaConfig;

    dummy?: boolean;
}

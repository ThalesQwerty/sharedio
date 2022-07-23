import { Client, Channel, SerializedEntity, ViewChanges, ViewDeletions } from "../../sharedio";
import { KeyValueDifference } from "../../sharedio";
import { KeyValue } from "../../sharedio";

/**
 * Base interface for outputs
 */
export interface SharedIOBaseOutput {
    type: "auth" | "ping" | "view" | "write" | "call" | "return" | "join" | "leave";
    id: string;
    data: KeyValue;
    channel: Channel;

    /**
     * Information that is needed to handle correctly the output, but won't be sent to the user
     */
    hidden?: {
        /**
         * Specifies, if applicable, a client that is responsible for the generation of this output.
         */
        client?: Client;

        /**
         * If true, sends this output only to the client specified.
         * Otherwise, sends this output to every client connected to the channel, except the client specified.
         */
        private?: boolean;
    }
}

/**
 * Result of the user authentication
 */
export interface AuthOutput extends SharedIOBaseOutput {
    type: "auth";
    data: {
        userId: string;
        token: string;
    }
}

/**
 * Sends a new ping to the client
 */
export interface PingOutput extends SharedIOBaseOutput {
    type: "ping";
    data: {
        packetId: string;
        roundTripTime: number;
        packetLossRatio: number;
    }
}

/**
 * Sends updates of the user view in a given channel
 */
export interface ViewOutput extends SharedIOBaseOutput {
    type: "view";
    data: {
        changes: ViewChanges,
        deleted: ViewDeletions
    }
}

/**
 * Broadcasts a property update to the clients
 */
export interface WriteOutput extends SharedIOBaseOutput {
    type: "write";
    data: {
        entity: string;
        properties: KeyValue;
    }
}

/**
 * Broadcasts a function call to the clients
 */
export interface CallOutput extends SharedIOBaseOutput {
    type: "call";
    data: {
        entity: string;
        methodName: string;
        parameters: unknown[];
    }
}

/**
 * Sends the returned value of an entity's method to the user who called it
 */
export interface ReturnOutput extends SharedIOBaseOutput {
    type: "return";
    data: {
        inputId: string,
        returnedValue: unknown
    },
    hidden: {
        client: Client,
        private: true
    }
}

/**
 * Informs the user that he successfully joined a new channel and will start receiving outputs from it
 */
export interface JoinOutput extends SharedIOBaseOutput {
    type: "join",
    data: {
        message?: unknown
    }
}

/**
 * Informs the user that he left a channel and will no longer receive outputs from it
 */
export interface LeaveOutput extends SharedIOBaseOutput {
    type: "leave",
    data: {
        message?: unknown
    }
}

/**
 * Serialized version of an output, in order to be sent via websocket to the clients
 */
export type Serialized<OutputType extends SharedIOBaseOutput> = Omit<OutputType, "hidden"|"channel"> & {channel?: string};

export type Output =
    | AuthOutput
    | PingOutput
    | ViewOutput
    | WriteOutput
    | CallOutput
    | ReturnOutput
    | JoinOutput
    | LeaveOutput;

export type ChannelOutput =
    | WriteOutput
    | CallOutput
    | ReturnOutput
    | JoinOutput
    | LeaveOutput;


export type ServerOutput =
    | AuthOutput
    | PingOutput
    | ViewOutput;
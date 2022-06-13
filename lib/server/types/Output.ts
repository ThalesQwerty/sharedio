import { Client, SerializedEntity } from "../../sharedio";
import { KeyValueDifference } from "../../sharedio";
import { KeyValue } from "../../sharedio";
export interface SharedIOBaseOutput {
    type: "auth" | "ping" | "view" | "write" | "call" | "return";
    id: string;
    data: KeyValue;

    /**
     * Specifies, if applicable,  a client that is responsible for the generation of this output.
     */
    client?: Client;

    /**
     * If true, sends this output only to the client specified.
     * Otherwise, sends this output to every client connected to the channel, except the client specified.
     */
    private?: boolean;
}

export interface AuthOutput extends SharedIOBaseOutput {
    type: "auth";
    data: {
        userId: string;
        token: string;
    }
}

export interface PingOutput extends SharedIOBaseOutput {
    type: "ping";
    data: {
        packetId: string;
        roundTripTime: number;
        packetLossRatio: number;
    }
}

export interface ViewOutput extends SharedIOBaseOutput {
    type: "view";
    data: KeyValueDifference<KeyValue<SerializedEntity>>
}

export interface WriteOutput extends SharedIOBaseOutput {
    type: "write";
    data: {
        entityId: string;
        properties: KeyValue;
    }
}

export interface CallOutput extends SharedIOBaseOutput {
    type: "call";
    data: {
        entityId: string;
        methodName: string;
        parameters: unknown[];
    }
}

export interface ReturnOutput extends SharedIOBaseOutput {
    type: "return";
    data: {
        inputId: string,
        returnedValue: unknown
    },
    private: true
}

type Assigned<OutputType extends SharedIOBaseOutput> = OutputType&{client: Client};

export interface AssignedWriteOutput extends WriteOutput {
    client: Client
}

export interface AssignedCallOutput extends CallOutput {
    client: Client
}

export interface AssignedReturnOutput extends CallOutput {
    client: Client
}



export type Output =
    | AuthOutput
    | PingOutput
    | ViewOutput
    | WriteOutput
    | CallOutput
    | ReturnOutput;

export type ChannelOutput =
    | WriteOutput
    | CallOutput
    | ReturnOutput;

/**
 * Output with a client associated with it
 */
export type AssignedChannelOutput =
    | AssignedWriteOutput
    | AssignedCallOutput
    | AssignedReturnOutput;

export type ServerOutput =
    | AuthOutput
    | PingOutput;
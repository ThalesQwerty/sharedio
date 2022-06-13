import { Entity } from "../../entity";
import { KeyValue } from "../../sharedio";
import { Client } from "../../sharedio";
import { ClientEvents } from "../../sharedio";

interface SharedIOBaseInput {
    type: keyof ClientEvents;
    id: string;
    data: KeyValue
}

export interface AuthInput extends SharedIOBaseInput {
    type: "auth";
    data: {
        token: string | null;
    }
}

export interface PongInput extends SharedIOBaseInput {
    type: "pong";
    data: {
        packetId: string;
    }
}

export interface WriteInput extends SharedIOBaseInput {
    type: "write";
    data: {
        entityId: string;
        properties: KeyValue;
    }
}

export interface CallInput extends SharedIOBaseInput {
    type: "call";
    data: {
        entityId: string;
        methodName: string;
        parameters: unknown[];
    }
}

export interface RoutedWriteInput extends SharedIOBaseInput {
    type: "write";
    data: {
        entity: Entity;
        properties: KeyValue;
    };
    client: Client;
}

export interface RoutedCallInput extends SharedIOBaseInput {
    type: "call";
    data: {
        entity: Entity;
        methodName: string;
        parameters: unknown[];
    };
    client: Client;
}

export type Assigned<InputType extends SharedIOBaseInput> = InputType & { client: Client }

export type Input =
    | AuthInput
    | PongInput
    | WriteInput
    | CallInput;

export type ChannelInput =
    | WriteInput
    | CallInput;

export type ServerInput =
    | AuthInput
    | PongInput;

export type RoutedChannelInput =
    | RoutedWriteInput
    | RoutedCallInput

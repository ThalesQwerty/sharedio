import { ClientEvents } from "../types";
import { KeyValue } from "../types/KeyValue";
import { Client } from "./Client";

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

export type Assigned<InputType extends SharedIOBaseInput> = InputType&{client: Client}

export type Input =
    | AuthInput
    | PongInput
    | WriteInput
    | CallInput;

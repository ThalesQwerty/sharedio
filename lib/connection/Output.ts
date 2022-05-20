import { User } from "../schema";
import { KeyValue, SerializedEntity } from "../types";
import { KeyValueDifference } from "../utils";

export interface SharedIOBaseOutput {
    type: "auth" | "ping" | "view" | "write" | "call";
    id: string;
    data: KeyValue;
    user: User|null;
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

export type Output =
    | AuthOutput
    | PingOutput
    | ViewOutput
    | WriteOutput
    | CallOutput;

export type ChannelOutput =
    | WriteOutput
    | CallOutput;

export type ServerOutput =
    | AuthOutput
    | PingOutput;
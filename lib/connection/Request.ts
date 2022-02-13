import { ClientEvents } from "../types";
import { KeyValue } from '../types/KeyValue';

export interface SharedIOBaseRequest {
    action: keyof ClientEvents;
}

export interface SharedIOBaseAction extends SharedIOBaseRequest {
    entity: string;
}

export interface AuthRequest extends SharedIOBaseRequest {
    action: "auth";
    token: string | null;
}

export interface PongRequest extends SharedIOBaseRequest {
    action: "pong";
    packetId: string;
}

export interface WriteRequest extends SharedIOBaseAction {
    action: "write";
    props: KeyValue;
}

export type SharedIORequest = AuthRequest|PongRequest|WriteRequest;
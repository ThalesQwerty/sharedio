import { SharedIORequest, AuthRequest, PongRequest } from "..";
import { ListenerOverloads, EmitterOverloads } from "../utils";

interface ClientAuthEvent {
    request: AuthRequest;
}

interface ClientMessageEvent {
    request: SharedIORequest;
}

interface ClientPongEvent {
    request: PongRequest;
}

interface ClientCloseEvent {}

type AuthHandler = (event: ClientAuthEvent) => void;
type MessageHandler = (event: ClientMessageEvent) => void;
type PongHandler = (event: ClientPongEvent) => void;
type CloseHandler = () => void;

export interface ClientEvents {
    auth?: AuthHandler[];
    message?: MessageHandler[];
    pong?: PongHandler[];
    close?: CloseHandler[];
}

export interface ClientListenerOverloads
    extends ListenerOverloads<ClientEvents> {
    /**
     * This function will be called when a new user authenticates
     */
    (event: "auth", callback: AuthHandler): void;

    /**
     * This function will be called when a message arrives
     */
    (event: "message", callback: MessageHandler): void;

    /**
     * This function will be called when a user responds a "ping" with a "pong"
     */
    (event: "pong", callback: PongHandler): void;

    /**
     * This function will be called when an user disconnects
     */
    (event: "close", callback: CloseHandler): void;
}

export interface ClientEmitterOverloads
    extends EmitterOverloads<ClientEvents> {
    (event: "auth", props: ClientAuthEvent): void;
    (event: "message", props: ClientMessageEvent): void;
    (event: "pong", props: ClientPongEvent): void;
    (event: "close"): void;
}

import { SharedIORequest, AuthRequest, PongRequest } from "../..";
import { ListenerOverloads, EmitterOverloads } from "../../utils";
import { WriteRequest } from '../../connection/Request';

interface ClientAuthEvent {
    request: AuthRequest;
}

interface ClientMessageEvent {
    request: SharedIORequest;
}

interface ClientPongEvent {
    request: PongRequest;
}

interface ClientWriteEvent {
    request: WriteRequest;
}

interface ClientCloseEvent {}

type ClientAuthListener = (event: ClientAuthEvent) => void;
type ClientMessageListener = (event: ClientMessageEvent) => void;
type ClientPongListener = (event: ClientPongEvent) => void;
type ClientWriteListener = (event: ClientWriteEvent) => void;
type ClientCloseListener = () => void;

export interface ClientEvents {
    auth?: ClientAuthListener[];
    message?: ClientMessageListener[];
    pong?: ClientPongListener[];
    write?: ClientWriteListener[];
    close?: ClientCloseListener[];
}

export interface ClientListenerOverloads
    extends ListenerOverloads<ClientEvents> {
    /**
     * This function will be called when a new user authenticates
     */
    (event: "auth", callback: ClientAuthListener): void;

    /**
     * This function will be called when a message arrives
     */
    (event: "message", callback: ClientMessageListener): void;

    /**
     * This function will be called when a user responds a "ping" with a "pong"
     */
    (event: "pong", callback: ClientPongListener): void;

    /**
     * This function will be called when a user attempts to edit a entity's attributes
     */
     (event: "write", callback: ClientWriteListener): void;

    /**
     * This function will be called when an user disconnects
     */
    (event: "close", callback: ClientCloseListener): void;
}

export interface ClientEmitterOverloads
    extends EmitterOverloads<ClientEvents> {
    (event: "auth", props: ClientAuthEvent): void;
    (event: "message", props: ClientMessageEvent): void;
    (event: "pong", props: ClientPongEvent): void;
    (event: "write", props: ClientWriteEvent): void;
    (event: "close"): void;
}

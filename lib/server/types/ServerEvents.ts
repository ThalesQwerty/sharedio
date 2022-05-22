import { Server } from "../../sharedio";
import { ListenerOverloads, EmitterOverloads } from "../../sharedio";
import { User } from "../../sharedio";
import { Input } from "../../sharedio";

interface ServerStartEvent {}
interface ServerConnectionEvent {
    user: User;
}

interface ServerDisconnectionEvent {
    user: User;
}

interface ServerMessageEvent {
    user: User;
    message: Input;
}

export interface ServerTickEvent {}

export type ServerStartListener = () => void;
type ServerConnectionListener = (
    event: ServerConnectionEvent,
) => void;
type ServerDisconnectionListener = (
    event: ServerDisconnectionEvent,
) => void;
type ServerMessageListener = (event: ServerMessageEvent) => void;
type ServerTickListener = () => void;

export interface ServerEvents {
    connection?: ServerConnectionListener[];
    disconnection?: ServerDisconnectionListener[];
    message?: ServerMessageListener[];
    tick?: ServerTickListener[];
    nextTick?: ServerTickListener[];
    start?: ServerStartListener[];
}

export interface ServerListenerOverloads
    extends ListenerOverloads<ServerEvents> {
    /**
     * This function will be called right after the server starts
     */
    (event: "start", callback: ServerStartListener): Server;

    /**
     * This function will be called whenever an user connects
     */
    (event: "connection", callback: ServerConnectionListener): Server;

    /**
     * This function will be called whenever an user disconnects
     */
    (
        event: "disconnection",
        callback: ServerDisconnectionListener,
    ): Server;

    /**
     * This function will be called whenever a message is recieved from an user's websocket client
     */
    (event: "message", callback: ServerMessageListener): Server;

    /**
     * This function will be called every server tick
     */
    (event: "tick", callback: ServerTickListener): Server;

    /**
     * This function will be called in the next server tick
     */
    (event: "nextTick", callback: ServerTickListener): Server;
}
export interface ServerEmitterOverloads
    extends EmitterOverloads<ServerEvents> {
    (event: "start"): Server;
    (event: "connection", props: ServerConnectionEvent): Server;
    (event: "disconnection", props: ServerDisconnectionEvent): Server;
    (event: "message", props: ServerMessageEvent): Server;
    (event: "tick"): Server;
    (event: "nextTick"): Server;
}

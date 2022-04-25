import { Server } from "../connection";
import { KeyValue } from "../types";
import { Entity } from "./";
import { Channel } from "./Channel";
import { User } from "./User";

type Input = {
    id: string;
    user: User;
    type: "create"|"delete"|"write"|"call";
    data: KeyValue
}

type Output = {
    id: string;
    type: "create"|"delete"|"write"|"call";
    data: KeyValue
}

/**
 * This class is specialized in storing I/Os in a queue and executing them every server sync
 */
export class Queue {
    public get channel() {
        return this._channel;
    }

    public get output() {
        return this._output;
    }
    private _output: Output[] = [];

    /**
     * Lists which entities have changes that haven't been sent to the users yet
     */
    public get entities() {
        return this._entities;
    }
    private _entities:KeyValue<Entity> = {};

    /**
     * Sends the current changes to the users and clears the update queue
     */
    public broadcast() {
        return this.runOutput();

        for (const user of this.channel.users) {
            for (const entityId in this._entities) {
                const entity = this._entities[entityId];

                user.view.render(entity);
            }
            user.view.update();
        }

        this._entities = {};
    }

    /**
     * Adds a new entry for output queue
     */
    public addOutput(output: Output) {
        this._output.push(output);
    }

    /**
     * Sends the current changes to the users and clears the update queue
     */
    public runOutput() {
        for (const user of this.channel.users) {
            for (const output of this._output) {
                user.client.sendRaw({
                    action: "output",
                    ...output
                });
            }
        }
    }

    public constructor(private _channel: Channel) {

    }
}
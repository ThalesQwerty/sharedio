import { Server } from "../connection";
import { KeyValue } from "../types";
import { Entity } from "./";
import { Channel } from "./Channel";

/**
 * This class is specialized in storing and sending the server updates to the users
 */
export class Queue {
    public get channel() {
        return this._channel;
    }

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
     * Adds a new change to the update queue
     */
    public add(newEntity: Entity) {
        this._entities[newEntity.id] = newEntity;
        console.log(`Added ${newEntity.id} to the update queue`);
    }

    public constructor(private _channel: Channel) {

    }
}
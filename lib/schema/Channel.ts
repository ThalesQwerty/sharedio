import { Server } from "../connection";
import { ChannelReservedAttributeName, EntityEmitterOverloads, EntityEvents, EntityListenerOverloads, EntityReservedAttributeName } from "../types";
import { EventEmitter, EventListener } from "../utils";
import { Entity } from "./Entity";
import { User } from "./User";

export class Channel extends Entity {
    public get users() {
        return this._users;
    }
    private _users: User[] = [];

    public get entities() {
        return this._entities;
    }
    private _entities: Entity[] = [];

    public join(user: User) {
        this._users.push(user);
    }

    public leave(user: User) {
        this._users = this._users.filter(currentUser => !currentUser.is(user));

        this.on("create", () => null);
    }
}
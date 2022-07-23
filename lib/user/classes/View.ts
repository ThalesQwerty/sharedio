import _ from "lodash";
import { SerializedEntity, Entity, EntityReservedAttributeName, EntityAttributeName, Cache, Channel, ViewOutput, ViewInterface, ViewChanges, ViewDeletions, Output, WriteOutput } from "../../sharedio";
import { ObjectTransform, KeyValueDifference } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { User, Client } from "../../sharedio";

/**
 * Class specialized in serializing entities as JSON and sending them to users
 */
export class View {
    /**
     * Who is viewing?
     */
    public get user() {
        return this._user;
    }

    /**
     * The channel where this view is being generated from
     */
    public get channel() {
        return this._channel;
    }

    /**
     * Returns a JSON that represents what the user is viewing right now
     */
    public get current() {
        return this._current;
    }
    private _current: ViewInterface = {};

    /**
     * Returns a JSON that represents the changes that will be sent to the user in the next server tick
     */
    public get changes() {
        return this._changes;
    }
    private _changes: ViewChanges = {};

    /**
     * Returns an array of entities and entity properties that have been deleted or hidden from this user's perspective
     */
    public get deleted() {
        return this._deleted;
    }
    private _deleted: ViewDeletions = [];

    constructor(private _user: User, private _channel: Channel) {
        for (const entity of _channel.entities) {
            this.render(entity);
        }

        this.update();
    }

    /**
     * Destroys this view
     */
    public destroy() {
        this.reset();
    }

    /**
     * Returns how the user is currently viewing an entity as JSON.
     *
     * If the entity is not visible for the user, this function returns null.
     */
    public get(entity: Entity): SerializedEntity | null {
        return this._current[entity.id] ?? null;
    }

    /**
     * Forces a re-render of an entity into the view
     */
    public render(entity: Entity) {
        this._changes[entity.id] = this.serialize(entity);
    }

    /**
     * Hides an entity (or some of its properties) from this user's perspective
     * @param entity
     * @param propertyNames
     */
    public hide<EntityType extends Entity>(entity: EntityType, ...propertyNames: EntityAttributeName<EntityType>[]) {
        if (propertyNames.length) {
            for (const propertyName of propertyNames) {
                this._deleted.push(`${entity.id}.state.${propertyName}`);
            }
        } else {
            this._deleted.push(entity.id);
        }
    }

    /**
     * Sends the current changes and deletions as JSON to the user, and turns it into the current view
     * @param clients Should it send only to some specific user clients? If left blank, it will send to all user clients.
     */
    public update(...clients: Client[]) {
        const output: Omit<ViewOutput, "id"> = {
            type: "view",
            channel: this.channel,
            data: {
                changes: this.changes,
                deleted: this.deleted
            }
        };

        for (const changedKey in this.changes) {
            const changes = this.changes[changedKey];

            this.current[changedKey] = ObjectTransform.merge(this.current[changedKey] ?? {}, changes);
        }

        for (const deletedKey in this.deleted) {
            let parent = this.current as KeyValue;
            let childKey = deletedKey;

            while (childKey.includes(".")) {
                if (!Object.keys(parent).includes(childKey)) continue;
                parent = parent[childKey.split(".")[0]];
                childKey = childKey.substring(childKey.indexOf(".") + 1);
            }

            delete parent[childKey];
        }

        this.user.send(output, ...clients);

        this._changes = {};
        this._deleted = [];
    }

    /**
     * Sends the entire current view as a JSON to the user. This is a potentially expensive method, so it should only be called when a new client of this user connects and needs to be informed of the channel's current state.
     * @param clients Should it send only to some specific user clients? If left blank, it will send to all user clients.
     */
    public forceUpdate(...clients: Client[]) {
        console.log("view", this.current);

        this.user.send({
            type: "view",
            channel: this.channel,
            data: {
                changes: this.current,
                deleted: []
            }
        }, ...clients);
    }

    /**
     * Automatically updated the user's view given an output
     */
    public handleOutput(output: Omit<WriteOutput, "id">) {
        const { entity: entityId, properties } = output.data;

        this._changes[entityId] ??= {};

        if (this._changes[entityId]) {
            this._changes[entityId].state ??= {};
            const stateChanges = this._changes[entityId] as SerializedEntity;

            for (const propertyName in properties) {
                const newValue = properties[propertyName];

                if (newValue === undefined) {
                    this._deleted.push(propertyName);
                } else {
                    stateChanges.state[propertyName] = newValue;
                }
            }
        }

        this.update();
    }

    /**
     * Clears the current view
     */
    public reset() {
        this._current = {};
    }

    /**
     * Returns a serialized version of an entity, that can be sent as a JSON to the user
     */
    public serialize<EntityType extends Entity>(
        entity: EntityType,
    ): SerializedEntity {
        const serialized: SerializedEntity = {
            id: entity.id,
            type: entity.type,
            owner: this.user.owns(entity),
            inside: entity instanceof Channel && this.user.in(entity),
            roles: {},
            state: {},
            actions: [],
        };

        for (const attributeName of Entity.attributes(entity) as EntityAttributeName<EntityType>[]) {
            if (this._user.can("output", entity, attributeName)) {
                const attributeValue = entity[attributeName];

                if (typeof attributeValue === "function") {
                    serialized.actions.push(attributeName);
                } else {
                    serialized.state[attributeName] = entity[attributeName];
                }
            }
        }

        for (const roleName of Object.keys(entity.schema.userRoles)) {
            serialized.roles[roleName] = entity.roles.verify(this.user, roleName);
        }

        return ObjectTransform.clone(serialized);
    }
}

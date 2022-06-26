import { SerializedEntity, RawEntity, EntityReservedAttributeName, EntityAttributeName, Cache, RawChannel, ViewOutput } from "../../sharedio";
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
     * Returns a JSON that represents what the user is viewing right now
     */
    public get current() {
        return this._current;
    }
    private _current: KeyValue<SerializedEntity, string> = {};

    /**
     * Returns a JSON that represents the changes that will be sent to the user in the next server tick
     */
    public get changes() {
        return this._changes;
    }
    private _changes: KeyValue<SerializedEntity, string> = {};

    /**
     * Returns an array of entities and entity properties that have been deleted or hidden from this user's perspective
     */
    public get deleted() {
        return this._deleted;
    }
    private _deleted: string[] = [];

    constructor(private _user: User) {}

    /**
     * Returns how the user is currently viewing an entity as JSON.
     *
     * If the entity is not visible for the user, this function returns null.
     */
    public get(entity: RawEntity): SerializedEntity | null {
        return this._current[entity.id] ?? null;
    }

    /**
     * Forces a re-render of an entity into the view
     */
    public render(entity: RawEntity) {
        this._changes[entity.id] = this.serialize(entity);
    }

    /**
     * Hides an entity (or some of its properties) from this user's perspective
     * @param entity
     * @param propertyNames
     */
    public hide<EntityType extends RawEntity>(entity: EntityType, ...propertyNames: EntityAttributeName<EntityType>[]) {
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
            data: {
                changes: this.changes,
                deleted: this.deleted
            }
        };

        for (const changedKey in this.changes) {
            const newValue = this.changes[changedKey];

            this.current[changedKey] = newValue;
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

        if (clients.length) {
            for (const client of clients) {
                if (client.user?.is(this.user)) {
                    client.send(output);
                }
            }
        } else {
            this.user.send(output);
        }
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
    public serialize<EntityType extends RawEntity>(
        entity: EntityType,
    ): SerializedEntity {
        const serialized: SerializedEntity = {
            id: entity.id,
            type: "RawEntity",
            owner: this.user.owns(entity),
            inside: entity instanceof RawChannel && this.user.in(entity),
            roles: {},
            state: {},
            actions: [],
        };

        for (const attributeName of RawEntity.attributes(entity) as EntityAttributeName<EntityType>[]) {
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

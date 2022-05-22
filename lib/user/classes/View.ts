import { SerializedEntity, RawEntity, EntityReservedAttributeName, EntityAttributeName, Cache } from "../../sharedio";
import { ObjectTransform, KeyValueDifference } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { User } from "../../sharedio";

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
    private _user: User;

    /**
     * Returns a JSON that represents what the user is viewing right now
     */
    public get current() {
        return this._current;
    }
    private _current: KeyValue<SerializedEntity, string> = {};

    /**
     * Returns a JSON that represents what the user will view in the next server tick
     */
    public get next() {
        return this._next;
    }
    private _next: KeyValue<SerializedEntity, string> = {};

    /**
     * Returns the difference between the current view and the next view as a JSON
     */
    public get changes() {
        return ObjectTransform.delta(
            this._current,
            this._next,
        ) as KeyValueDifference<KeyValue<SerializedEntity>>;
    }

    /**
     * Returns how the user is currently viewing an entity as JSON.
     *
     * If the entity is not visible for the user, this function returns null.
     */
    public find(entity: RawEntity): SerializedEntity | null {
        return this._current[entity.id] ?? null;
    }

    constructor(viewer: User) {
        this._user = viewer;
    }

    /**
     * Renders an entity into the view
     */
    public render(entity: RawEntity) {
        this._next = {};
        this._next[entity.id] = this.serialize(entity);
    }

    /**
     * Sends the next view as JSON to the user, and turns it into the current view
     */
    public update() {
        const difference = this.changes;

        if (Object.keys(difference.add).length || difference.remove.length) {
            this.user.client.send({
                type: "view",
                id: "",
                data: {
                    ...difference
                },
                user: null
            });
        }

        this._current = ObjectTransform.clone(this._next);
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
        const clone = RawEntity.clone(entity);

        const serialized: SerializedEntity = {
            owned: false,
            type: "RawEntity",
            id: "",
            state: {},
            actions: [],
        };

        function removeAttribute(name: string) {
            delete (clone as any)[name];
            delete (clone as any)["_" + name];
        }

        for (const reservedAttribute of RawEntity.reservedAttributes) {
            switch (reservedAttribute) {
                case "id":
                    serialized.id = entity.id;
                    break;
                case "type":
                    serialized.type = entity.type;
                    break;
                case "owner":
                    serialized.owned = !!(
                        entity.owner?.id && entity.owner.is(this.user)
                    );
                    break;
            }
            removeAttribute(reservedAttribute);
        }

        const currentEntityCache = Cache.get(entity);

        for (const _attributeName in clone) {
            if (
                RawEntity.reservedAttributes.indexOf(
                    _attributeName as EntityReservedAttributeName,
                ) < 0
            ) {
                const attributeName =
                    _attributeName as EntityAttributeName<EntityType>;

                const rawValue = (clone as any)[attributeName];
                const rules = entity.schema.attributes[attributeName];
                const authorized = entity.roles.verify(this.user, rules.output);

                const cached = currentEntityCache[attributeName];
                const isCached =
                    Object.keys(currentEntityCache).indexOf(
                        attributeName,
                    ) >= 0;

                let attributeBehavior: "attribute" | "method" | undefined =
                    undefined;
                let serializedValue = undefined;

                if (authorized) {
                    if (typeof rawValue === "function") {
                        attributeBehavior = "method";
                    } else {
                        attributeBehavior = "attribute";
                        serializedValue = serialized.state[
                            attributeName
                        ] = isCached ? cached : rawValue;
                    }
                }

                switch (attributeBehavior) {
                    case "attribute":
                        serialized.state[attributeName] =
                            serializedValue;
                        break;
                    case "method":
                        serialized.actions.push(attributeName);
                        break;
                }
            }
        }

        return serialized;
    }
}

import { RawEntity, EntityAttributeName, UserRoles, Client } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { User } from "../../sharedio";

/**
 * Class specialized in executing users' actions in the server
 */
export class Action {
    private _user: User;

    constructor(user: User) {
        this._user = user;
    }

    /**
     * Attempts to create a new entity
     */
    public create() {}

    /**
     * Attempts to delete an entity
     */
    public delete() {}

    /**
     * Attempts to write values into an entity's attributes
     */
    public write<EntityType extends RawEntity>(
        entity: EntityType,
        values: KeyValue<any, EntityAttributeName<EntityType>>,
        debug: boolean = false
    ) {
        const viewed = this._user.view.current[entity.id];

        debug && console.log("write", RawEntity.printable(entity), values);

        for (const _attributeName in values) {
            const attributeName =
                _attributeName as EntityAttributeName<EntityType>;
            const newValue = (values as any)[attributeName];

            const authorized = this._user.can("input", entity, attributeName);

            if (authorized && newValue !== undefined) {
                entity[attributeName] = newValue;
                viewed.state[attributeName] = newValue;
            } else {
                debug && console.log(`can't write into "${attributeName}"`);
            }
        }

        debug && console.log("-->", RawEntity.printable(entity));
    }

    /**
     * Attempts to call an entity's method
     */
    public call<EntityType extends RawEntity>(
        entity: EntityType,
        methodName: EntityAttributeName<EntityType>,
        parameters?: unknown[],
    ): unknown {
        const authorized = this._user.can("input", entity, methodName);

        if (
            authorized &&
            typeof entity[methodName] === "function"
        ) {
            const method = entity[methodName] as any as (...args: any[]) => unknown;
            const returnedValue = parameters ? method.call(entity, ...parameters) : method.call(entity);  //, this._user);

            return returnedValue;
        }
    }
}

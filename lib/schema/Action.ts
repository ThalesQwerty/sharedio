import { User, Entity } from ".";
import { EntityAttributeName, KeyValue } from "../types";
import { UserRoles } from "./Roles";

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
    public write<EntityType extends Entity>(
        entity: EntityType,
        values: KeyValue<any, EntityAttributeName<EntityType>>,
        debug: boolean = true
    ) {
        const viewed = this._user.view.current[entity.id];

        debug && console.log("write", Entity.printable(entity), values);

        for (const _attributeName in values) {
            const attributeName =
                _attributeName as EntityAttributeName<EntityType>;
            const newValue = (values as any)[attributeName];

            const authorized = UserRoles.verifyCombination("input", entity.roles.combinationId(this._user), entity.schema.attributes[attributeName]);

            if (authorized && newValue !== undefined) {
                entity[attributeName] = newValue;
                viewed.state[attributeName] = newValue;
            } else {
                debug && console.log(`can't write into "${attributeName}"`);
            }
        }

        debug && console.log("-->", Entity.printable(entity));
    }

    /**
     * Attempts to call an entity's method
     */
    public call<EntityType extends Entity>(
        entity: EntityType,
        methodName: EntityAttributeName<EntityType>,
        params?: unknown[],
    ) {
        const authorized = UserRoles.verifyCombination("input", entity.roles.combinationId(this._user), entity.schema.attributes[methodName]);

        if (
            authorized &&
            typeof entity[methodName] === "function"
        ) {
            const method = entity[methodName] as unknown as Function;
            params ? method(...params) : method();  //, this._user);
        }
    }
}

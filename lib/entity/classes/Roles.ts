import { KeyValue } from "../../sharedio";
import { User } from "../../sharedio";
import { EntityBuiltinRoleName, EntityRolesData, EntityRolesInterface, EntityRoleBooleanExpression } from "../../sharedio";
import { EntitySchemaAttribute } from "../../sharedio";
import { Entity } from "../../sharedio";

/**
 * Lists the user roles that are built-in on the entities
 */
export const BuiltinRoles = Object.freeze({
    /**
     * All users have this role
     */
    USER: "all",

    /**
     * Automatically assigned to the user who created this entity
     */
    OWNER: "owner",

    /**
     * (Applies only for channels)
     *
     * Automatically assigned to whoever enters this channel
     *
     * Automatically revoked from whoever leaves this channel
     */
    MEMBER: "inside",

    /**
     * Equivalent to the owner of the channel this entity is in
     */
    HOST: "host",
}) as Readonly<KeyValue<EntityBuiltinRoleName, "USER"|"OWNER"|"MEMBER"|"HOST">>;
export class UserRoles {
    /**
     * Adds user roles to the entity
     */
    static apply(entity: Entity, {lists: roleLists, binary: binaryEncoded}: EntityRolesData): EntityRolesInterface<any> {
        return {
            assign: (user: User, ...roles: EntityBuiltinRoleName[]) => {
                binaryEncoded[user.id] ??= 0;

                for (const role of roles) {
                    const {value: roleValue} = entity.schema.userRoles[role];
                    roleLists[role] ??= [];

                    if (!roleLists[role].find(currentUser => currentUser.is(user))) {
                        roleLists[role].push(user);
                        // todo: emit "changeRole" event
                    }

                    if ((binaryEncoded[user.id] & roleValue) === 0) binaryEncoded[user.id] += entity.schema.userRoles[role].value;
                }
            },

            revoke: (user: User, ...roles: EntityBuiltinRoleName[]) => {
                for (const role of roles) {
                    const {value: roleValue} = entity.schema.userRoles[role];
                    roleLists[role] ??= [];
                    roleLists[role] = roleLists[role].filter(currentUser => {
                        const found = currentUser.is(user);

                        if (found) {
                            // todo: emit "changeRole" event
                        }

                        return !found;
                    });

                    if (binaryEncoded[user.id] && (binaryEncoded[user.id] & roleValue) === roleValue) binaryEncoded[user.id] -= entity.schema.userRoles[role].value;
                }
            },

            list: (user: User) => {
                const list: EntityBuiltinRoleName[] = [BuiltinRoles.USER];

                for (const _role in roleLists) {
                    const role = _role as EntityBuiltinRoleName;
                    if (entity.roles.verify(user, role) && !list.includes(role)) list.push(role);
                }

                return list;
            },

            users: (role: EntityBuiltinRoleName) => {
                roleLists[role] ??= [];
                return roleLists[role];
            },

            verify: (user: User|string[], role: EntityBuiltinRoleName) => {
                if (user instanceof Array) return user.includes(role);

                switch (role) {
                    case BuiltinRoles.USER:
                        return true;
                    default:
                        roleLists[role] ??= [];
                        return !!roleLists[role].find(currentUser => currentUser.is(user));
                }
            },

            verifyExpression: (user: User|string[], expression: EntityRoleBooleanExpression) => {
                if (!expression) return false;

                const userRoles = user instanceof Array ? user : entity.roles.list(user);

                return this.test(userRoles, expression);
            },

            combinationId: (user: User) => {
                return binaryEncoded[user.id] ?? 0;
            }
        }
    }

    /**
     * Verifies if a given array of user roles satisfies a boolean expression
     */
    static test (userRoles: string[], expression: EntityRoleBooleanExpression<string[]>) {
        if (!expression) return false;

        // needs to be sorted by length (descending), in order to avoid some bugs in the regex
        // ex: type "ally" contains the string "all" in it, so "ally" has to be checked before "all"
        userRoles.sort((a: string, b: string) => a.length < b.length ? 1 : -1);

        let booleanExpression: string = expression;

        for (const assignedRole of userRoles) {
            booleanExpression = booleanExpression.replace(new RegExp(assignedRole, "g"), "*");
        }

        booleanExpression = booleanExpression.replace(/\s+/, "").replace(/\w+/g, "0").replace(/\*/g, "1");

        const passed = !!eval(booleanExpression);
        return passed;
    }

    /**
     * Verifies if a given role combination ID satisfies the input/output rules of an attribute
     */
    static verifyCombination<EntityType extends Entity>(action: "input"|"output", userRoleCombinationId: number, attributeSchema: EntitySchemaAttribute<EntityType>) {
        const list = attributeSchema.binary[action];
        if (!list.length) return false;

        const blacklist = list[0] === -1;

        for (const combinationId of list) {
            if (userRoleCombinationId === combinationId) return !blacklist;
        }

        return blacklist;
    }
}
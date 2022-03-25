import { EntityBuiltinRoleName, EntityRoleBooleanExpression, KeyValue } from "../types";
import { Entity } from "./Entity";
import { User } from "./User";

/**
 * Adds user roles to the entity
 */
export function UserRoles(entity: Entity, roleArrays: KeyValue<User[], EntityBuiltinRoleName>): any {
    return {
        assign: (user: User, ...roles: EntityBuiltinRoleName[]) => {
            for (const role of roles) {
                roleArrays[role] ??= [];

                if (!roleArrays[role].find(currentUser => currentUser.is(user))) {
                    roleArrays[role].push(user);
                    // todo: emit "changeRole" event
                }
            }
        },

        revoke: (user: User, ...roles: EntityBuiltinRoleName[]) => {
            for (const role of roles) {
                roleArrays[role] ??= [];
                roleArrays[role] = roleArrays[role].filter(currentUser => {
                    const found = currentUser.is(user);

                    if (found) {
                        // todo: emit "changeRole" event
                    }

                    return !found;
                });
            }
        },

        list: (user: User) => {
            const list: EntityBuiltinRoleName[] = ["all"];

            for (const _role in roleArrays) {
                const role = _role as EntityBuiltinRoleName;
                if (entity.roles.verify(user, role) && !list.includes(role)) list.push(role);
            }

            return list;
        },

        users: (role: EntityBuiltinRoleName) => {
            roleArrays[role] ??= [];
            return roleArrays[role];
        },

        verify: (user: User, role: EntityBuiltinRoleName) => {
            if (role === "all") return true;
            roleArrays[role] ??= [];
            return !!roleArrays[role].find(currentUser => currentUser.is(user));
        },

        verifyExpression: (user: User, expression: EntityRoleBooleanExpression) => {
            if (!expression) return false;

            const userRoles = entity.roles.list(user);

            // needs to be sorted by length (descending), in order to avoid some bugs in the regex
            // ex: type "ally" contains the string "all" in it, so "ally" has to be checked before "all"
            userRoles.sort((a: string, b: string) => a.length < b.length ? 1 : -1);

            let booleanExpression: string = expression;

            for (const assignedRole of userRoles) {
                booleanExpression = booleanExpression.replace(new RegExp(assignedRole, "g"), "1");
            }

            booleanExpression = booleanExpression.replace(/\s+/, "").replace(/\w+/g, "0");

            const passed = !!eval(booleanExpression);

            return passed;
        }
    }
}
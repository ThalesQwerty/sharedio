import { Entity, User } from "../../schema";

/**
 * Classifies the main kinds of users in relation to an entity
 *
 * @owner The owner of the entity, usually the user who created it
 * @host The owner of the channel where the entity is located
 * @inside All users who are inside the entity (only applies if the entity is a channel)
 * @all All users who may interact with the entity
 */
 export type EntityBuiltinRoleName =
 | "owner"
 | "host"
 | "inside"
 | "all";

type PartialKeyOf<ObjectType, ValueType> = { [KeyName in keyof ObjectType]: ObjectType[KeyName] extends ValueType ? KeyName : never }[keyof ObjectType];

export type EntityCustomRoleName<Roles extends string[]> = Roles[number];

export type EntityRoleName<Roles extends string[] = []> = EntityCustomRoleName<Roles>|EntityBuiltinRoleName;

type EntityRoleBooleanOperator = "&"|"|";
type OP = EntityRoleBooleanOperator|` ${EntityRoleBooleanOperator} `;

type SingleExpression<Roles extends string[]> = (EntityRoleName<Roles>|`!${EntityRoleName<Roles>}`)|(`(!${EntityRoleName<Roles>})`);
type DoubleExpresison<Roles extends string[]> = `${EntityRoleName<Roles>}${OP}${EntityRoleName<Roles>}`|`(${EntityRoleName<Roles>}${OP}${EntityRoleName<Roles>})`|`!(${EntityRoleName<Roles>}${OP}${EntityRoleName<Roles>})`;
type MultiExpression = `${string}${OP}${string}${OP}${string}`;

export type EntityRoleBooleanExpression<Roles extends string[] = []> = SingleExpression<Roles> | DoubleExpresison<Roles> | MultiExpression;

export interface EntityRolesInterface<Roles extends string[] = []> {
    /**
     * Assigns one or more roles to an user
     */
    assign: (user: User, ...roles: EntityRoleName<Roles>[]) => void,

    /**
     * Revokes one or more roles from an user
     */
    revoke: (user: User, ...roles: EntityRoleName<Roles>[]) => void,

    /**
     * Verifies if an user has a given role
     */
    verify: {
        (user: User, role: EntityRoleName<Roles>): boolean,
        (userRoles: string[], role: EntityRoleName<Roles>): boolean,
    },

    /**
     * Verifies if the roles of an user satisfy a boolean expression
     *
     * Examples:
     *
     * - If the user has role A and role B, they satisfy the expression `"A & B"`
     * - If the user has role A or role B, they satisfy the expression  `"A | B"`
     * - If the user doesn't have the role A, they satisfy the expression `"!A"`
     */
    verifyExpression: {
        (user: User, expression: EntityRoleBooleanExpression): boolean,
        (userRoles: string[], expression: EntityRoleBooleanExpression): boolean,
    }

    /**
     * Lists all roles an user has on this entity
     */
    list: (user: User) => Roles,

    /**
     * Lists all users that have a given role
     */
    users: (role: EntityRoleName<Roles>) => User[]
}
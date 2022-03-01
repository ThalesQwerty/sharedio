import { Entity, User } from "../../schema";
import { KeyValue, Letter } from "..";
import { HasEvents, HasId } from "../../utils";
import { Server } from "../../connection";

export type EntityReservedAttributeName =
    | keyof Entity
    | keyof HasId
    | "resetId"
    | "_listeners"
    | "emit"
    | "constructor"
    | "removeAllListeners";

export interface EntityConfig<EntityType extends Entity = Entity> {
    server: Server;
    initialState?: Partial<
        KeyValue<EntityAttribute, EntityAttributeName<EntityType>>
    >;
    owner?: User | null;
}

export type EntityAttributeName<EntityType extends Entity> = Exclude<
    keyof EntityType,
    EntityReservedAttributeName | number | symbol
>;

export type EntityClassName = typeof Entity | string;

type AttributePrimitives =
    | string
    | number
    | boolean
    | null
    | undefined
    | HasId;
export type EntityAttribute =
    | AttributePrimitives
    | AttributePrimitives[]
    | KeyValue<AttributePrimitives | AttributePrimitives[]>;

export type EntityMethod = Function;

export type EntityWithAttribute<name extends string> = Entity & {
    [key in name]: any;
};

export type EntityGetAccessor = (
    /**
     * Who is trying to read this property?
     *
     * Value will be undefined if property is being read by the server
     */
    user?: User,
) => any;

export type EntitySetAccessor = <ValueType = any>(
    /**
     * The value that is being written into this attribute
     */
    value?: ValueType,

    /**
     * Who is trying to read this property?
     *
     * Value will be undefined if property is being read by the server
     */
    user?: User,
) => void;

export type EntityVariant = (
    /**
     * Who is trying to interact with this entity?
     */
    user?: User,
) => boolean;

/**
 * Classifies the main kinds of users in relation to an entity
 *
 * @owner The owner of the entity, usually the user who created it
 * @host The owner of the channel where the entity is located
 * @inside All users who are inside the entity (only applies if the entity is a channel)
 * @all All users who may interact with the entity
 */
export type EntityDefaultVariantName =
    | "owner"
    | "host"
    | "inside"
    | "all";

type PartialKeyOf<ObjectType, ValueType> = { [KeyName in keyof ObjectType]: ObjectType[KeyName] extends ValueType ? KeyName : never }[keyof ObjectType];

export type EntityCustomVariantName<
    EntityType extends Entity = Entity,
    > = EntityAttributeName<EntityType> & PartialKeyOf<EntityType, EntityVariant>
//`is${Capitalize<Letter>}${string}`;

export type EntityVariantName<EntityType extends Entity = Entity> =
    | EntityDefaultVariantName
    | EntityCustomVariantName<EntityType>

export type EntityIntersectionVariantCamelCaseName<EntityType extends Entity> =
    | `${EntityVariantName<EntityType>}${Capitalize<EntityVariantName<EntityType>>}`
    | `${EntityVariantName<EntityType>}${Capitalize<EntityVariantName<EntityType>>}${Capitalize<EntityVariantName<EntityType>>}`

// export type EntityIntersectionVariantName<EntityType extends Entity> =
//     | `${EntityVariantName<EntityType>}&${EntityVariantName<EntityType>}`
//     | `${EntityVariantName<EntityType>}&${EntityVariantName<EntityType>}&${EntityVariantName<EntityType>}`
//     | `${string}&${string}&${string}&${string}`

type EntityVariantBooleanOperator = "&"|"|";
type OP = EntityVariantBooleanOperator|` ${EntityVariantBooleanOperator} `;

type SingleExpression<T extends Entity> = (EntityVariantName<T>|`!${EntityVariantName<T>}`)|(`(!${EntityVariantName<T>})`);
type DoubleExpresison<T extends Entity> = `${SingleExpression<T>}${OP}${SingleExpression<T>}`|`(${SingleExpression<T>}${OP}${SingleExpression<T>})`|`!(${SingleExpression<T>}${OP}${SingleExpression<T>})`;
type MultiExpression<T extends Entity> = `${string}${OP}${string}${OP}${string}`;

export type EntityVariantBooleanExpression<EntityType extends Entity = Entity> = SingleExpression<EntityType> | DoubleExpresison<EntityType> | MultiExpression<EntityType>;

/**
 * Allows (+) or denies (-) read/write access for an user class
 */
export type AllowedEntityVariant<EntityType extends Entity = Entity> = EntityVariantName<EntityType>;

export type DeniedEntityVariant<EntityType extends Entity = Entity> = `!${EntityVariantName<EntityType>}`;

export type EntityUserAccessPolicyClause<EntityType extends Entity = Entity> = EntityVariantBooleanExpression<EntityType>[];

export type EntityUserAccessPolicy<
    EntityType extends Entity = Entity,
    > = {
        read: EntityVariantBooleanExpression<EntityType>|"";
        write: EntityVariantBooleanExpression<EntityType>|"";
    };

export interface EntityRuleSchema {
    [entityType: string]: {
        [attributeName: string]: EntityAttributeRules;
    };
}
export interface EntityAttributeRules<
    EntityType extends Entity = Entity,
    > {
    entityType: string;
    attributeName: string;

    loaded: {
        [action in keyof EntityUserAccessPolicy<EntityType>]: boolean
    };

    /**
     * Determines who can read/write this attribute
     */
    accessPolicy: EntityUserAccessPolicy<EntityType>;

    /**
     * Determines whether or not this method will be treated as a computed property
     */
    hasGetAccessor: boolean;

    /**
     * Determines whether or not this method will be treated as a watched property
     */
    hasSetAccessor: boolean;

    isVariant: boolean;

    isMethod: boolean;

    methodImplementation?: Function;

    /**
     * Determines for how long this property will be cached before being updated again for users
     */
    cacheDuration: number;
}

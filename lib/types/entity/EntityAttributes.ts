import { Entity, User } from "../../schema";
import { KeyValue } from "..";
import { HasId } from "../../utils";

export type EntityDefaultAttributeName =
    | keyof Entity
    | "resetId"
    | "_listeners"
    | "emit"
    | "constructor"
    | "removeAllListeners"
    | "_Constructor";

export type EntityAttributeName<EntityType extends Entity> = Exclude<keyof EntityType, EntityDefaultAttributeName|number|symbol>

type AttributePrimitives = string | number | boolean | null | undefined | HasId;
export type EntityAttribute = AttributePrimitives | AttributePrimitives[] | KeyValue<AttributePrimitives|AttributePrimitives[]>;

export type EntityMethod = Function;

export type EntityWithAttribute<name extends string> = Entity&{[key in name]: any};

export type GetAccessor = (
    /**
     * Who is trying to read this property?
     *
     * Value will be undefined if property is being read by the server
     */
    user?: User
) => any;

export type SetAccessor = <ValueType = any>(
    /**
     * The value that is being written into this attribute
     */
    value?: ValueType,

    /**
     * Who is trying to read this property?
     *
     * Value will be undefined if property is being read by the server
     */
    user?: User
) => void;
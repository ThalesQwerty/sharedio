import { UsePolicy } from ".";
import { Entity } from "..";
import { EntityAttributeName, EntityUserAccessPolicy, KeyValue } from "../../types";

export type EntityDecorator = <EntityType extends Entity>(
    entity: EntityType,
    attributeName: EntityAttributeName<EntityType>,
) => void;

const defaultUserAccessPolicy: EntityUserAccessPolicy = {
    read: "all",
    write: "owner",
};

const userAccessPolicyPresets: KeyValue<
    Partial<EntityUserAccessPolicy>,
    | "public"
    | "protected"
    | "private"
    | "internal"
    | "readonly"
    | "writable"
    | "controlled"
> = {
    public: {
        read: "all",
    },
    protected: {
        read: "inside",
    },
    private: {
        read: "owner",
    },
    internal: {
        read: "!all",
    },
    readonly: {
        write: "!all",
    },
    writable: {
        write: "all",
    },
    controlled: {
        read: "host",
        write: "host",
    },
};

export { defaultUserAccessPolicy, userAccessPolicyPresets };

/**
 * @SharedIO Rule Decorator
 *
 * All users can read this attribute
 *
 * Equivalent to:
 * ```ts
 * @If("all")
 * ```
 */
 const Public: EntityDecorator = UsePolicy(
    userAccessPolicyPresets.public,
);

/**
 * @SharedIO Rule Decorator
 *
 * Only users inside this channel can read this attribute
 *
 * Equivalent to:
 * ```ts
 * @If("inside")
 */
const Protected: EntityDecorator = UsePolicy(
    userAccessPolicyPresets.protected,
);

/**
 * @SharedIO Rule Decorator
 *
 * Only the entity's owner can read this attribute
 *
 * Equivalent to:
 * ```ts
 * @If("owner")
 * ```
 */
const Private: EntityDecorator = UsePolicy(
    userAccessPolicyPresets.private,
);

/**
 * @SharedIO Rule Decorator
 *
 * No user can read this attribute, it's server-side only.
 *
 * Equivalent to:
 * ```ts
 * @Unless("all")
 * ```
 *
 * This decorator is optional, since it's also equivalent for using no decorator at all.
 */
const Internal: EntityDecorator = UsePolicy(
    userAccessPolicyPresets.internal,
);

/**
 * @SharedIO Rule Decorator
 *
 * Only the owner of the channel where this entity is in can read or write this attribute.
 *
 * Equivalent to:
 * ```ts
 * @If("host") @WritableIf("host")
 * ```
 */
const Controlled: EntityDecorator = UsePolicy(
    userAccessPolicyPresets.controlled,
);

/**
 * @SharedIO Rule Decorator
 *
 * Denies write access to all users (the attribute value can still be altered by the server, though)
 *
 * Equivalent to:
 * ```ts
 * @WritableUnless("all")
 * ```
 */
const Readonly: EntityDecorator = UsePolicy(
    userAccessPolicyPresets.readonly,
);

/**
 * @SharedIO Rule Decorator
 *
 * Grants write access to all users who can view this attribute
 *
 * NOTE: This is a dangerous policy, because it's the only one that can allow multiple users to edit simultaneously the same attribute, which can lead to latency issues. Don't use this decorator unless you're 100% sure about what you're doing.
 *
 * Equivalent to:
 * ```ts
 * @WritableIf("all")
 * ```
 */
const Writable: EntityDecorator = UsePolicy(
    userAccessPolicyPresets.writable,
);

export {
    Public,
    Private,
    Protected,
    Internal,
    Controlled,
    Readonly,
    Writable,
};
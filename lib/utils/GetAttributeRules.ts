export interface AttributeRules {
    /**
     * Determines who can read this attribute
     *
     * @public Every user can read
     * @private Only the entity's owner can read
     * @internal No one can read, it's a server-only attribute
     */
    visibility: "public"|"private"|"internal",

    /**
     * Determines whether or not this attribute can be altered by the entity's owner
     */
    readonly: boolean

    /**
     * Returns the attribute's name without the modifiers
     */
    parsedName: string
}

export function GetAttributeRules(attributeName: string): AttributeRules {
    let parsed = attributeName;

    const isInternal = attributeName.substring(0, 2) === "__"; //__internal
    const isPrivate = attributeName[0] === "_";
    const isReadonly = attributeName.toUpperCase() === attributeName;

    if (isInternal) parsed = parsed.substring(1);
    if (isPrivate) parsed = parsed.substring(1);
    if (isReadonly) parsed = parsed.toLowerCase();

    const rules: AttributeRules = {
        visibility: isInternal ? "internal" : isPrivate ? "private" : "public",
        readonly: isReadonly,
        parsedName: parsed
    };

    return rules;
}
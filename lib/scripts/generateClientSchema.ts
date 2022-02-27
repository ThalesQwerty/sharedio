import fs from "fs";
import path from "path";
import { ClientSchemaConfig, EntityAttributeRules, EntityRuleSchema, EntitySubtypeName, KeyValue } from "../types";
import { exec } from "child_process";
import { Rules } from "..";

export function generateClientSchema(schema: EntityRuleSchema, config: ClientSchemaConfig) {
    const newPath = path.join(config.path ?? ".", config.fileName ?? "schema.ts");

    let fileContent: string = `
    /*
        This file has been generated automatically by SharedIO.
        Please don't edit it unless you're 100% sure of what you're doing.
    */

    `;

    type EntityUserRelationCombination =
        EntitySubtypeName
        | `${EntitySubtypeName}.${EntitySubtypeName}`
        | `${EntitySubtypeName}.${EntitySubtypeName}.${EntitySubtypeName}`
        | `${EntitySubtypeName}.${EntitySubtypeName}.${EntitySubtypeName}.${EntitySubtypeName}`;

    const interfaceNames: Partial<KeyValue<string, EntityUserRelationCombination>> = {
        "all": "Default",

        "all.isHost": "Host",
        "all.isOwner": "Owner",
        "all.isInside": "Inside",

        "all.isHost.isInside": "HostInside",
        "all.isInside.isOwner": "OwnerInside",
        "all.isHost.isOwner": "OwnerHost",

        "all.isHost.isInside.isOwner": "OwnerHostInside",
    }

    function isSubtypeBuiltin(subtypeName: string) {
        return subtypeName === "all" || subtypeName === "isHost" || subtypeName === "isInside" || subtypeName === "isOwner";
    }

    const libName = "../../lib"; // "sharedio-client";

    fileContent += `import type { SharedIOSchema, EntityListSchema } from "${libName}";

    namespace Entity {
        interface Base<EntityType extends string> {
            readonly id: \`Entity_\${string}\`;
            readonly type: EntityType;

            /**
             * Does the user own this entity?
             */
            readonly owned: boolean;

            /**
             * Does the user host this entity?
             */
            readonly hosted: boolean;

            /**
             * Is the user inside this channel?
             */
            readonly inside: boolean;
        }

        ${Object.keys(interfaceNames).map(
        userRelationCombination => createBaseEntityInterface(userRelationCombination as EntityUserRelationCombination)
    ).join(" ")}
    };
    `;

    for (const entityType in schema) {
        const entitySchema = schema[entityType];

        const subtypes = { ...Rules.subtypes(entityType) };

        // @ts-expect-error
        delete subtypes.all;
        // @ts-expect-error
        delete subtypes.isHost;
        // @ts-expect-error
        delete subtypes.isOwner;
        // @ts-expect-error
        delete subtypes.isInside;

        const interfaceNamesWithSubtypes: KeyValue = {
            ...interfaceNames
        };

        for (const subtypeName in subtypes) {
            for (const key in interfaceNamesWithSubtypes) {
                const interfaceName = interfaceNamesWithSubtypes[key];
                interfaceNamesWithSubtypes[`${key}.${subtypeName}`] = interfaceName !== "Default" ? `${interfaceName}${subtypeName.substring(2)}` : subtypeName.substring(2);
            }
        }

        fileContent += createEntityNamespace(entityType, Object.keys(interfaceNamesWithSubtypes).map(
            key => createEntityInterface(entityType, entitySchema, {
                current: key.split(".") as EntitySubtypeName[],
                currentBuiltin: key.split(".").filter(key => isSubtypeBuiltin(key)) as EntitySubtypeName[],
                custom: Object.keys(subtypes) as EntitySubtypeName[]},
                interfaceNamesWithSubtypes
            )
        ), interfaceNamesWithSubtypes);
    }

    fileContent += `
    export interface ${config.interfaceName ?? "Schema"} extends SharedIOSchema {
        ${Object.keys(schema).map(entityType => createEntitySchemaList(entityType)).join(";")}
    }`;

    function createBaseEntityInterface(userRelationCombination: EntityUserRelationCombination) {
        const userRelations = userRelationCombination.split(".") as EntitySubtypeName[];
        const interfaceName = interfaceNames[userRelationCombination];

        return `
        export interface ${interfaceName}<EntityType extends string> extends Base<EntityType> {
            readonly owned: ${!!userRelations.find(userRelation => userRelation === "isOwner")};
            readonly hosted: ${!!userRelations.find(userRelation => userRelation === "isHost")};
            readonly inside: ${!!userRelations.find(userRelation => userRelation === "isInside")};
        }`;
    }

    function createEntityNamespace(entityType: string, entityInterfaces: string[], interfaceNamesWithSubtypes: KeyValue<string, EntityUserRelationCombination>) {
        return `
        export namespace ${entityType} {
            ${entityInterfaces.join(" ")}

            export type ${entityType} = ${Object.keys(interfaceNamesWithSubtypes).map(
            userRelationCombination => interfaceNamesWithSubtypes[userRelationCombination as EntityUserRelationCombination]
        ).join("|")};
        }
        `;
    }

    function createEntityInterface(entityType: string, entityRules: KeyValue<EntityAttributeRules>, subtypes: {current: EntitySubtypeName[], currentBuiltin: EntitySubtypeName[], custom: EntitySubtypeName[]}, interfaceNamesWithSubtypes: KeyValue<string, EntityUserRelationCombination>) {
        const key = subtypes.current.join(".") as EntityUserRelationCombination;
        const builtinKey = subtypes.currentBuiltin.join(".") as EntityUserRelationCombination;

        const interfaceName = interfaceNamesWithSubtypes[key];
        const extendedInterfaceName = interfaceNames[builtinKey];

        return interfaceName ? `
        export interface ${interfaceName} extends Entity.${extendedInterfaceName}<"${entityType}"> {
            ${subtypes.custom.map(subtype =>
                `readonly ${subtype}: ${subtypes.current.find(v => v === subtype) ? "true" : "false"}`
            ).join(";")}

            ${Object.keys(entityRules).map(
            attributeName => createEntityInterfaceMember(entityType, attributeName, entityRules[attributeName], subtypes.current)
        ).filter(content => content).join(";")}
        }
        ` : "";
    }

    function createEntityInterfaceMember(entityType: string, attributeName: string, attributeRules: EntityAttributeRules, userRelations: EntitySubtypeName[]) {
        const readable = !attributeRules.isSubtype && Rules.verify(userRelations, "read", entityType, attributeName);
        if (!readable) return "";

        const writable = Rules.verify(userRelations, "write", entityType, attributeName);
        const { isMethod } = attributeRules;
        const type = isMethod ? "() => void" : "any";

        return `${writable ? "" : "readonly"} ${attributeName}: ${type}`;
    }

    function createEntitySchemaList(entityType: string) {
        return `${entityType}: EntityListSchema<${entityType}.${entityType}>`;
    }

    fs.writeFileSync(newPath, fileContent);

    exec(`npx prettier --write ${newPath}`, () => {
        console.log(`Client schema generated successfully at ${newPath}`)
    });
}


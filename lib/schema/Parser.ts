import fs from "fs";
import Path from "path";
import { EntityAttributeRules, EntityRuleSchema, EntityUserRelation, KeyValue } from "../types";
import { exec } from "child_process";

export function generateClientSchema(schema: EntityRuleSchema, path: string = "", fileName: `${string}.ts` = "schema.ts") {
    const newPath = Path.join(path, fileName);

    let fileContent: string = `
    /*
        This file has been generated automatically by SharedIO.
        Please don't edit it unless you're 100% sure of what you're doing.
    */

    `;

    const interfaceNames: KeyValue<string, EntityUserRelation> = {
        all: "Default",
        owner: "Owned",
        host: "Hosted",
        insider: "Inside",
    }

    for (const entityName in schema) {
        const entitySchema = schema[entityName];

        fileContent += createEntityNamespace(entityName, Object.keys(interfaceNames).map(
            interfaceName => createEntityInterface(entitySchema, interfaceName as EntityUserRelation)
        ));
    }

    function createEntityNamespace(entityName: string, entityInterfaces: string[]) {
        return `
        export namespace ${entityName} {
            ${entityInterfaces.join(" ")}
        }
        `;
    }

    function createEntityInterface(entityRules: KeyValue<EntityAttributeRules>, userRelation: EntityUserRelation) {
        return `
        export interface ${interfaceNames[userRelation]} {
            ${Object.keys(entityRules).map(
                attributeName => createEntityInterfaceMember(attributeName, entityRules[attributeName], userRelation)
            ).filter(content => content).join(";")}
        }
        `;
    }

    function createEntityInterfaceMember(attributeName: string, attributeRules: EntityAttributeRules, userRelation: EntityUserRelation) {
        const readable = attributeRules.accessPolicy.read.find(group => group === userRelation || group === "all") ? true : false;
        if (!readable) return "";

        const writable = readable && !!attributeRules.accessPolicy.write.find(group => group === userRelation || group === "all");
        const { isMethod } = attributeRules;
        const type = isMethod ? "() => void" : "any";

        return `${writable ? "" : "readonly"} ${attributeName}: ${type}`;
    }

    fs.writeFileSync(newPath, fileContent);

    exec(`npx prettier --write ${newPath}`, () => {
        console.log(`Client schema generated successfully at ${newPath}`)
    });
}


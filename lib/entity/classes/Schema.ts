import { Server } from "../../sharedio";
import { RawChannel } from "../../sharedio";
import { ObjectTransform, StringTransform } from "../../sharedio";
import { KeyValue } from "../../sharedio";
import { ClientSchemaConfig } from "../../sharedio";
import { ExtractDependencies } from "../../sharedio";
import { EntityAttributeType, EntityAttributeName } from "../../sharedio";
import { EntitySchema, EntitySchemaAttribute } from "../../sharedio";
import { RawEntity } from "../../sharedio";
import { BuiltinRoles, UserRoles } from "../../sharedio";
import path from "path";
import fs from "fs";
import {exec} from "child_process";
import "reflect-metadata";

export abstract class Schema {
    private static _schemas: KeyValue<EntitySchema<any>, string> = {};

    static get all() {
        return ObjectTransform.clone(this._schemas);
    }

    static generate<EntityType extends RawEntity = RawEntity>(entityClass: typeof RawEntity) {
        const dummy = new entityClass({ server: Server.dummy, channel: Server.dummy.mainChannel, dummy: true });
        const attributeList = RawEntity.attributes(dummy);

        const getType = (object: any, attributeName: string): string | undefined => {
            const type = Reflect.getMetadata(
                "design:type",
                object,
                attributeName
            )?.name.toLowerCase() as EntityAttributeType;

            return type === "object" ? undefined : type;
        }

        const generatedSchema = {
            className: dummy.type,
            userRoles: {
                all: {
                    name: BuiltinRoles.USER,
                    value: 0
                }
            },
            isChannel: dummy instanceof RawChannel,
            attributes: {} as any
        };

        const defaultSchema: EntitySchemaAttribute<EntityType> = {
            name: "" as EntityAttributeName<EntityType>,
            type: "any",
            initialValue: undefined,
            dependencies: [],
            output: "",
            input: "",
            get: false,
            set: false,
            binary: {
                input: [],
                output: [],
            }
        };

        for (const _attributeName of attributeList) {
            const attributeName = _attributeName as EntityAttributeName<EntityType>;
            const initialValue = (dummy as any)[attributeName];
            generatedSchema.attributes[attributeName] = {
                ...ObjectTransform.clone(defaultSchema),
                name: attributeName,
                type: getType(dummy, attributeName) ?? typeof initialValue,
                initialValue
            }
        }

        const computedAttributes = Object.getOwnPropertyDescriptors(entityClass.prototype);

        for (const _attributeName in computedAttributes) {
            const attributeName = _attributeName as EntityAttributeName<EntityType>;
            if (attributeName !== "constructor") {
                const propertyDescriptor = computedAttributes[attributeName];
                const dependencies = ExtractDependencies(entityClass as typeof RawEntity, attributeName) as EntityAttributeName<EntityType>[];
                const initialValue = (dummy as any)[attributeName];

                generatedSchema.attributes[attributeName] = {
                    ...defaultSchema,
                    name: attributeName,
                    type: getType(entityClass.prototype, attributeName) ?? typeof initialValue,
                    initialValue,
                    get: !!propertyDescriptor.get,
                    set: !!propertyDescriptor.set,
                    dependencies
                }
            }
        }

        this._schemas[entityClass.name] = generatedSchema;

        // Can only execute after the entities' decorators have been executed
        process.nextTick(() => {
            this.optimize(generatedSchema as EntitySchema<EntityType>);
        });

        return generatedSchema as EntitySchema<EntityType>;
    }

    /**
     * This function calculates beforehands the access level that each user role has on each property of an entity and then stores this information on its schema
     */
    private static optimize<EntityType extends RawEntity>(schema: EntitySchema<EntityType>) {
        const numRoles = Object.keys(schema.userRoles).length - 1;
        const numCombinations = Math.pow(2, numRoles);

        const maxWhitelistLength = Math.max(1, Math.ceil(numCombinations / 2));

        /**
         * It's not viable to verify roles everytime an user tries to view or interact with an entity,
         * since this computation might take some time.
         *
         * Therefore, I decided to calculate all possible outcomes beforehands and store the values in the entity schema.
         */
        for (const attributeName in schema.attributes) {
            const attribute = schema.attributes[attributeName as EntityAttributeName<EntityType>];

            // denied combinations
            // the "-1" at the start indicates that this list is a blacklist and not a whitelist
            const blacklist = {
                input: [-1] as number[],
                output: [-1] as number[]
            };

            // allowed combinations
            const whitelist = {
                input: [] as number[],
                output: [] as number[]
            };

            for (let roleCombinationId = 0; roleCombinationId < numCombinations; roleCombinationId++) {
                const currentRoles: string[] = [];

                for (const role in schema.userRoles) {
                    const { value, name } = schema.userRoles[role];
                    if ((roleCombinationId & value) === value) currentRoles.push(name);
                }

                const isInput = UserRoles.test(currentRoles, attribute.input);
                const isOutput = isInput || UserRoles.test(currentRoles, attribute.output);

                (isInput ? whitelist : blacklist).input.push(roleCombinationId);
                (isOutput ? whitelist : blacklist).output.push(roleCombinationId);
            }

            /**
             * If most roles don't have input/output access, the list can be shortened if instead
             * of listing the allowed roles (whitelist), it lists the denied roles (blacklist)
             */
            for (const key of ["input", "output"] as ("input" | "output")[]) {
                attribute.binary[key] = whitelist[key].length <= maxWhitelistLength ? whitelist[key] : blacklist[key];
            }
        }
    }

    /**
     * Generates a .ts file to be used as a schema by the SharedIO client
     * @param schema The schema to be exported
     * @param config Configuration parameters
     */
    static export(config: ClientSchemaConfig) {
        const schema = this.all;

        const newPath = path.join(
            config.path ?? ".",
            config.fileName ?? "schema.ts",
        );

        const libName = "../../lib"; // "sharedio-client";

        let fileContent: string = `
        /*
            This file has been generated automatically by SharedIO.
            Please don't edit it unless you're 100% sure of what you're doing.
        */

        import type { SharedIOSchema, EntityListSchema } from "${libName}";

        interface RawEntity {
            readonly id: string;
            readonly type: string;
            readonly owned: boolean;

            readonly delete: () => void;
        }

        interface RawChannel extends RawEntity {
            readonly inside: boolean;

            readonly join: () => void;
            readonly leave: () => void;
        }

        `;

        const schemaInterfaceMemberDeclarations: string[] = [];

        // This code will generate client schemas for each user role in the entity
        for (const entityName in schema) {
            const entitySchema = schema[entityName];

            const userRoles = Object.keys(entitySchema.userRoles).filter(role => role !== BuiltinRoles.USER); // "all" is excluded beacuse it's impossible for an user to not have this role

            fileContent += `namespace ${entityName} {`;

            const roleCombinations: string[] = [];

            // 2^n possible combinations
            for (let counter = 0; counter < Math.pow(2, userRoles.length); counter++) {
                const includedRoles: string[] = [BuiltinRoles.USER];
                let booleanRoleDeclarations = "";

                /**
                 * This code "secretly" converts the current counter value to binary, and associates each bit to an index on the role array, in reverse order.
                 * If the current bit is 1, it will push the current role into the includedRoles array.
                 * If the current bit is 0, it will just ignore it.
                 *
                 * Examples:
                 * When the counter is in 0 (0b0000), includedRoles = []
                 * When the counter is in 1 (0b0001), includedRoles = [userRoles[0]]
                 * When the counter is in 2 (0b0010), includedRoles = [userRoles[1]]
                 * When the counter is in 3 (0b0011), includedRoles = [userRoles[0], userRoles[1]]
                 * When the counter is in 4 (0b0100), includedRoles = [userRoles[2]]
                 * When the counter is in 5 (0b0101), includedRoles = [userRoles[0], userRoles[2]]
                 * When the counter is in 6 (0b0110), includedRoles = [userRoles[1], userRoles[2]]
                 * When the counter is in 7 (0b0111), includedRoles = [userRoles[0], userRoles[1], userRoles[2]]
                 * ... and so on
                 */
                for (let index = 0; index < userRoles.length; index++) {
                    const currentRole = userRoles[index];
                    const binaryValue = Math.pow(2, index);

                    entitySchema.userRoles[currentRole].value = binaryValue;

                    if ((counter & binaryValue) === binaryValue && !includedRoles.includes(currentRole)) {
                        booleanRoleDeclarations += `${currentRole}: true;`
                        includedRoles.push(currentRole);
                    } else {
                        booleanRoleDeclarations += `${currentRole}: false;`
                    }
                }

                const interfaceName = includedRoles.length > 1 ? includedRoles.map(role => role === BuiltinRoles.USER ? "" : StringTransform.capitalize(role)).join("") : "Default";
                roleCombinations.push(interfaceName);

                fileContent += `export interface ${interfaceName} extends ${entitySchema.isChannel ? "RawChannel" : "RawEntity"} {
                    readonly owned: ${includedRoles.includes(BuiltinRoles.OWNER)}; ${entitySchema.isChannel ? `readonly inside: ${includedRoles.includes(BuiltinRoles.MEMBER)};` : ""}
                    readonly roles: {
                        ${booleanRoleDeclarations}
                    }
                `;

                for (const attributeName in entitySchema.attributes) {
                    const { name, type, input, output, binary } = entitySchema.attributes[attributeName];

                    const accessType: "input" | "output" | "hidden" = UserRoles.test(includedRoles, input) ? "input" : UserRoles.test(includedRoles, output) ? "output" : "hidden";

                    if (accessType !== "hidden") {
                        if (type === "function") {
                            fileContent += `${name}: (...args: any[]) => any`;
                        } else {
                            if (accessType === "output") fileContent += "readonly ";
                            fileContent += `${name}: ${type};`;
                        }
                    }
                }

                fileContent += `}`;
            }

            fileContent += `}

            export type ${entityName} = ${roleCombinations.map(name => `${entityName}.${name}`).join("|")};

            `;

            schemaInterfaceMemberDeclarations.push(`${entityName}: EntityListSchema<${entityName}>;`);
        }

        fileContent += `export interface ${config.interfaceName || "Schema"} extends SharedIOSchema {
           ${schemaInterfaceMemberDeclarations.join("")}
        }

        export default ${config.interfaceName || "Schema"};
        `;

        fs.writeFileSync(newPath, fileContent);

        exec(`npx prettier --write ${newPath}`, () => {
            console.log(
                `Client schema generated successfully at ${newPath}`,
            );
        });
    }
}
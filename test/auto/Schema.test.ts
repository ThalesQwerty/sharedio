import { Entity, input, output, hidden, shared, EntityConfig, inputIf, outputIf, hiddenIf, Channel } from "../../lib";
import { flag } from "../../lib/entity";
import { server } from "./common/server";

class AttributeTestEntity extends Entity {
    a = 1;
    @input b = 2;
    @output c = 3;
    @input @output d = 4;
    @output @input e = 5;
    @hidden f = 6;
    @shared g = 7;
}

class TypeTestEntity extends Entity {
    @input number = 1;
    @output string = "Hi";
    @hidden boolean = true;

    array = [];
    object = {};

    method() { }
}

class DecoratorTestEntity extends Entity {
    @input input = 1;
    @output output = 2;
    @hidden hidden = 3;
    @shared shared = 4;
}

class UserRoleTestEntity extends Entity {
    @flag role1 = true;
    @flag role2 = false;

    @input input = 1;
    @output output = 2;
    @hidden hidden = 3;
    @shared shared = 4;

    @inputIf("role1") inputRole1 = 0;
    @outputIf("role1") outputRole1 = 0;
    @hiddenIf("role1") hiddenRole1 = 0;

    @inputIf("role2") inputRole2 = 0;
    @outputIf("role2") outputRole2 = 0;
    @hiddenIf("role2") hiddenRole2 = 0;

    @outputIf("role1", "role2") testImplicitOr = 0;
    @outputIf("role1 | role2") testOr = 0;
    @outputIf("role1 & role2") testAnd = 0;
    @outputIf("!role1") testNot = 0;
    @outputIf("!role1 | role2") testNotOr = 0;
    @outputIf("!role1 & role2") testNotAnd = 0;
    @outputIf("!(role1 & role2)") testNand = 0;
    @outputIf("!(role1 | role2)") testNor = 0;
    @outputIf("role1 ? !role2 : role2") testXor = 0;
}

class AccessorTestEntity extends Entity {
    _test = 0;
    get test() {
        return this._test;
    }
    set test(newValue) {
        this._test = newValue;
    }

    get getter() {
        return 1;
    }

    set setter(newValue: number) {
        this._test = newValue;
    }
}

jest.setTimeout(10000);

const testChannel = server.createChannel(Channel, { syncRate: 1 });

describe("Schema", () => {
    it("Lists entity attributes correctly", async () => {
        const entity = await testChannel.$create(AttributeTestEntity) as AttributeTestEntity;
        const { schema } = entity;
        const attributeNames = Object.keys(schema.attributes);

        expect(attributeNames).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
    });

    it("Detects entity class name", async () => {
        const attributeTestEntity = await testChannel.$create(AttributeTestEntity) as AttributeTestEntity;
        const typeTestEntity = await testChannel.$create(TypeTestEntity) as TypeTestEntity;
        const decoratorEntity = await testChannel.$create(DecoratorTestEntity) as DecoratorTestEntity;

        expect(attributeTestEntity.schema.className).toBe("AttributeTestEntity");
        expect(typeTestEntity.schema.className).toBe("TypeTestEntity");
        expect(decoratorEntity.schema.className).toBe("DecoratorTestEntity");
    })

    it("Detects entity attribute types", async () => {
        const entity = await testChannel.$create(TypeTestEntity) as TypeTestEntity;
        const { schema } = entity;
        const { attributes } = schema;

        expect(attributes.number.type).toBe("number");
        expect(attributes.string.type).toBe("string");
        expect(attributes.boolean.type).toBe("boolean");
        expect(attributes.method.type).toBe("function");
        expect(attributes.array.type).toBe("object");
        expect(attributes.object.type).toBe("object");
    });

    it("Generates user roles", async () => {
        const entity = await testChannel.$create(DecoratorTestEntity) as DecoratorTestEntity;
        const { schema } = entity;
        const { flags } = schema;

        expect(flags).toHaveProperty("true");
        expect(flags).toHaveProperty("owned");
    });

    it("Creates access policies correctly", async () => {
        const entity = await testChannel.$create(DecoratorTestEntity) as DecoratorTestEntity;
        const { schema } = entity;
        const { attributes } = schema;

        setImmediate(() => {
            expect(attributes.input.binary).toEqual({
                output: [1],
                input: [1]
            });

            expect(attributes.output.binary).toEqual({
                output: [-1],
                input: []
            });

            expect(attributes.hidden.binary).toEqual({
                output: [],
                input: []
            });

            expect(attributes.shared.binary).toEqual({
                output: [-1],
                input: [1]
            });
        });
    });

    it("Handles user roles correctly", async () => {
        const entity = await testChannel.$create(UserRoleTestEntity) as UserRoleTestEntity;
        const { schema } = entity;
        const { attributes, flags } = schema;

        setImmediate(() => {
            expect(flags).toHaveProperty("true");
            expect(flags).toHaveProperty("false");
            expect(flags).toHaveProperty("owned");
            expect(flags).toHaveProperty("role1");
            expect(flags).toHaveProperty("role2");

            expect(flags.true.value).toBe(0);
            expect(flags.false.value).toBe(0);
            expect(flags.owned.value).toBe(1);
            expect(flags.role1.value).toBe(2);
            expect(flags.role2.value).toBe(4);

            const all = [-1];

            const owner = [1, 3, 5, 7];

            const role1 = [2, 3, 6, 7];
            const notRole1 = [0, 1, 4, 5];

            const role2 = [4, 5, 6, 7];
            const notRole2 = [0, 1, 2, 3];

            const role1_or_role2 = [-1, 0, 1] // [2, 3, 4, 5, 6, 7];
            const role1_and_role2 = [6, 7];
            const notRole1_or_role2 = [-1, 2, 3] // [0, 1, 4, 5, 6, 7];
            const notRole1_and_role2 = [4, 5];
            const role1_nor_role2 = [0, 1];
            const role1_nand_role2 = [-1, 6, 7] // [0, 1, 2, 3, 4, 5];
            const role1_xor_role2 = [2, 3, 4, 5];

            expect(attributes.input.binary).toEqual({
                output: owner,
                input: owner
            });

            expect(attributes.output.binary).toEqual({
                output: all,
                input: []
            });

            expect(attributes.hidden.binary).toEqual({
                output: [],
                input: []
            });

            expect(attributes.shared.binary).toEqual({
                output: all,
                input: owner
            });

            expect(attributes.inputRole1.binary).toEqual({
                output: role1,
                input: role1
            });

            expect(attributes.outputRole1.binary).toEqual({
                output: role1,
                input: []
            });

            expect(attributes.hiddenRole1.binary).toEqual({
                output: notRole1,
                input: []
            });

            expect(attributes.inputRole2.binary).toEqual({
                output: role2,
                input: role2
            });

            expect(attributes.outputRole2.binary).toEqual({
                output: role2,
                input: []
            });

            expect(attributes.hiddenRole2.binary).toEqual({
                output: notRole2,
                input: []
            });

            expect(attributes.testNot.binary).toEqual({
                output: notRole1,
                input: []
            }),

                expect(attributes.testImplicitOr.binary).toEqual({
                    output: role1_or_role2,
                    input: []
                }),

                expect(attributes.testOr.binary).toEqual({
                    output: role1_or_role2,
                    input: []
                }),

                expect(attributes.testAnd.binary).toEqual({
                    output: role1_and_role2,
                    input: []
                }),

                expect(attributes.testNor.binary).toEqual({
                    output: role1_nor_role2,
                    input: []
                }),

                expect(attributes.testNand.binary).toEqual({
                    output: role1_nand_role2,
                    input: []
                }),

                expect(attributes.testNotAnd.binary).toEqual({
                    output: notRole1_and_role2,
                    input: [],
                })

            expect(attributes.testNotOr.binary).toEqual({
                output: notRole1_or_role2,
                input: [],
            })

            expect(attributes.testXor.binary).toEqual({
                output: role1_xor_role2,
                input: [],
            })


        });
    });

    it("Detects getters and setters", async () => {
        const entity = await testChannel.$create(AccessorTestEntity) as AccessorTestEntity;
        const { schema } = entity;
        const { attributes } = schema;

        expect(attributes.test.get).toBe(true);
        expect(attributes.test.set).toBe(true);
        expect(attributes.test.type).toBe("number");

        expect(attributes.getter.get).toBe(true);
        expect(attributes.getter.set).toBe(false);
        expect(attributes.getter.type).toBe("number");

        expect(attributes.setter.get).toBe(false);
        expect(attributes.setter.set).toBe(true);
        expect(attributes.setter.type).toBe("undefined");


    })

});

import {
    Entity,
    Internal,
} from "../..";
import { EntitySchema } from "../../lib/types";
import { server } from "./common";

class WatchTestEntity extends Entity {
    number = 0;
    string = "";
    boolean = false;
    unchangedNumber = 0;
    unchangedString = "unchanged";
    unchangedBoolean = false;
    object = {
        a: 1,
        b: 2,
        constant: "constant",
        deep: {
            hello: "world"
        },
        pseudoNew: undefined
    };
    array = [0, 1, 2];
    pseudoNew = undefined;
    deletable: any = {
        deleteThis: 1,
        keepThis: 0
    }

    get computedValue() {
        return this.number + 1;
    }

    get computedValueWithConditional() {
        if (this.owner) {
            return this.string;
        } else {
            return this.number;
        }
    }
}

jest.setTimeout(1000);

describe("Watched entity", () => {
    it("Simple values, update", (done) => {
        const watched = new WatchTestEntity({ server }).then(() => {
            watched.number = 1;
            watched.string = "changed";
            watched.boolean = true;

            watched.unchangedNumber = 0;
            watched.unchangedString = "unchanged";
            watched.unchangedBoolean = false;
        });

        watched.on("change", ({ changes }) => {
            expect(changes).toEqual({
                number: 1,
                string: "changed",
                boolean: true
            });

            watched.off();
            done();
        });
    });

    it("Objects, update", (done) => {
        const watched = new WatchTestEntity({ server }).then(() => {
            watched.deletable = {
                new: "object",
                hello: "world"
            }
        });

        watched.on("change", ({ changes }) => {
            expect(changes).toEqual({
                deletable: {
                    new: "object",
                    hello: "world"
                }
            });

            watched.off();
            done();
        });
    });

    it("Arrays, update", (done) => {
        const watched = new WatchTestEntity({ server }).then(() => {
            watched.array = [0]
        });

        watched.on("change", ({ changes }) => {
            expect(changes).toEqual({
                array: [0]
            });

            watched.off();
            done();
        });
    });

    it("Object properties, update", (done) => {
        const watched = new WatchTestEntity({ server }).then(() => {
            watched.object.a = 50;
            watched.object.b = 100;
            watched.object.deep.hello = "bye";
        });

        watched.on("change", ({ changes }) => {
            expect(changes).toEqual({
                object: {
                    a: 50,
                    b: 100,
                    deep: {
                        hello: "bye"
                    }
                }
            });

            watched.off();
            done();
        });
    });

    it("Object properties, insertion", (done) => {
        const watched = new WatchTestEntity({ server }).then(() => {
            (watched.object as any).newValue = "surprise";
            (watched.object as any).newObject = {
                surprise: true
            };

            (watched.object as any).newUndefined = undefined;
            watched.object.pseudoNew = undefined;
        });

        watched.on("change", ({ changes }) => {
            expect(changes).toEqual({
                object: {
                    newValue: "surprise",
                    newObject: {
                        surprise: true
                    },
                    newUndefined: undefined
                }
            });

            watched.off();
            done();
        });
    });

    it("Object properties, deletion", (done) => {
        const watched = new WatchTestEntity({ server }).then(() => {
            delete watched.deletable.deleteThis;
        });

        watched.on("change", ({ changes }) => {
            expect(changes).toEqual({
                deletable: {
                    deleteThis: undefined
                }
            });

            watched.off();
            done();
        });
    });


    it("Array items, update", (done) => {
        const watched = new WatchTestEntity({ server }).then(() => {
            watched.array[0] = 2;
            watched.array[1] = 1;
            watched.array[2] = 0;
        });

        watched.on("change", ({ changes }) => {
            const { array } = changes;

            expect(changes).toEqual({
                array: [2, 1, 0]
            });

            watched.off();
            done();
        });
    });

    it("Array items, insertion", (done) => {
        const watched = new WatchTestEntity({ server }).then(() => {
            watched.array.push(3, 4);
            watched.array.unshift(-2, -1);
        });

        watched.on("change", ({ changes }) => {
            expect(changes).toEqual({
                array: [-2, -1, 0, 1, 2, 3, 4]
            });

            watched.off();
            done();
        });
    });

    it("Array items, deletion", (done) => {
        const watched = new WatchTestEntity({ server }).then(() => {
            watched.array.pop();
            watched.array.shift();
        });

        watched.on("change", ({ changes }) => {
            expect(changes).toEqual({
                array: [1]
            });

            watched.off();
            done();
        });
    });

    it("Gets dependencies of computed values", (done) => {
        const schema = WatchTestEntity.schema as EntitySchema<WatchTestEntity>;

        expect(schema.attributes.computedValue.dependencies).toEqual(["number"])
        expect(schema.attributes.computedValueWithConditional.dependencies).toEqual(["string", "number"]);

        done();
    })
});

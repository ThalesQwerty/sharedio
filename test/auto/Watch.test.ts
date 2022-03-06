import {
    Entity,
    Internal,
} from "../..";
import { server } from "./common";

class WatchTestEntity extends Entity {

    @Internal objectTest = {
        number: 0,
        string: "",
        boolean: false,
        unchangedNumber: 0,
        unchangedString: "unchanged",
        unchangedBoolean: false,
        object: {
            a: 1,
            b: 2,
            constant: "constant",
            deep: {
                hello: "world"
            },
            deleted: 0
        },
        array: [0, 1, 2],
        pseudoNew: undefined
    }

}

jest.setTimeout(5000);

describe("Watched entity", () => {
    it("Detects changes of simple values", (done) => {
        const watched = new WatchTestEntity({ server }).then(() => {
            const { objectTest } = watched;

            objectTest.number = 1;
            objectTest.string = "changed";
            objectTest.boolean = true;

            objectTest.unchangedNumber = 0;
            objectTest.unchangedString = "unchanged";
            objectTest.unchangedBoolean = false;
        });

        watched.on("change", ({ changes }) => {
            const { objectTest } = changes;

            expect(objectTest).toHaveProperty("number");
            expect(objectTest).toHaveProperty("string");
            expect(objectTest).toHaveProperty("boolean");

            expect(objectTest).not.toHaveProperty("unchangedNumber");
            expect(objectTest).not.toHaveProperty("unchangedString");
            expect(objectTest).not.toHaveProperty("unchangedBoolean");

            expect((objectTest as any).number).toBe(1);
            expect((objectTest as any).string).toBe("changed");
            expect((objectTest as any).boolean).toBe(true);

            watched.off();
            done();
        });
    });

    it("Detects changes in objects", (done) => {
        const watched = new WatchTestEntity({ server }).then(() => {
            const { objectTest } = watched;

            objectTest.object.a = 50;
            objectTest.object.b = 100;
            objectTest.object.deep.hello = "bye";
        });

        watched.on("change", ({ changes }) => {
            const { object } = changes.objectTest as any;

            expect(object).toHaveProperty("a");
            expect(object).toHaveProperty("b");
            expect(object).toHaveProperty("deep.hello");

            expect(object).not.toHaveProperty("constant");

            expect((object as any).a).toBe(50);
            expect((object as any).b).toBe(100);
            expect((object as any).deep.hello).toBe("bye");

            watched.off();
            done();
        });
    });

    it("Detects new properties in objects", (done) => {
        const watched = new WatchTestEntity({ server }).then(() => {
            const { objectTest } = watched;

            (objectTest as any).newValue = "surprise";
            (objectTest as any).newObject = {
                surprise: true
            };

            (objectTest as any).newUndefined = undefined;
            objectTest.pseudoNew = undefined;
        });

        watched.on("change", ({ changes }) => {
            const { objectTest } = changes as any;

            expect(objectTest).toHaveProperty("newValue");
            expect(objectTest).toHaveProperty("newObject.surprise");
            expect(objectTest).toHaveProperty("newUndefined");

            expect(objectTest).not.toHaveProperty("pseudoNew");

            expect((objectTest as any).newValue).toBe("surprise");
            expect((objectTest as any).newObject.surprise).toBe(true);
            expect((objectTest as any).newUndefined).toBe(undefined);

            watched.off();
            done();
        });
    });

    it("Detects changes in arrays", (done) => {
        const watched = new WatchTestEntity({ server }).then(() => {
            const { objectTest } = watched;

            objectTest.array[0] = 2;
            objectTest.array[1] = 1;
            objectTest.array[2] = 0;
        });

        watched.on("change", ({ changes }) => {
            const { array } = changes.objectTest as any;

            expect(array).toHaveProperty("0");
            expect(array).not.toHaveProperty("1");
            expect(array).toHaveProperty("2");
            expect(array).not.toHaveProperty("3");

            expect((array as any[])[0]).toBe(2);
            expect((array as any[])[2]).toBe(0);

            watched.off();
            done();
        });
    });

    it("Detects new items in arrays", (done) => {
        const watched = new WatchTestEntity({ server }).then(() => {
            const { objectTest } = watched;

            objectTest.array.push(3);
        });

        watched.on("change", ({ changes }) => {
            const { array } = changes.objectTest as any;

            expect(array).not.toHaveProperty("0");
            expect(array).not.toHaveProperty("1");
            expect(array).not.toHaveProperty("2");

            expect(array).toHaveProperty("3");
            expect((array as any[])[3]).toBe(3);

            watched.off();
            done();
        });
    });

    it("Detects deleted items in arrays", (done) => {
        const watched = new WatchTestEntity({ server }).then(() => {
            const { objectTest } = watched;

            objectTest.array.pop();
        });

        watched.on("change", ({ changes }) => {
            const { array } = changes.objectTest as any;

            expect(array).not.toHaveProperty("0");
            expect(array).not.toHaveProperty("1");
            expect(array).not.toHaveProperty("3");

            expect(array).toHaveProperty("2");
            expect((array as any[])[2]).toBe(undefined);

            watched.off();
            done();
        });
    });


});

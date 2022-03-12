import { Entity, Internal, Server } from "../../lib";

const server = new Server();

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
}

const watched = new WatchTestEntity({ server }).then(() => {
    delete watched.deletable.deleteThis;
});

watched.on("change", ({ changes }) => {
    watched.off();
});
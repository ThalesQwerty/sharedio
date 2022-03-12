import { Entity, Internal, Server } from "../../lib";

const server = new Server();

class WatchTestEntity extends Entity {
    @Internal number = 0;
    @Internal string = "";
    @Internal boolean = false;
    @Internal unchangedNumber = 0;
    @Internal unchangedString = "unchanged";
    @Internal unchangedBoolean = false;
    @Internal object = {
        a: 1,
        b: 2,
        constant: "constant",
        deep: {
            hello: "world"
        },
        pseudoNew: undefined
    };
    @Internal array = [0, 1, 2];
    @Internal pseudoNew = undefined;
    @Internal deletable: any = {
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
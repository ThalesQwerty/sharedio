import {
    Server,
    Entity,
    Public,
    Private,
    Readonly,
    Internal,
} from "../../lib";
class Player extends Entity {
    @Public name = "Thales";
    @Public power = 9001;

    @Private secret = "Shh...";

    @Internal serverSide = 0;

    @Readonly immutable = "Hello World!";

    @Private @Readonly immutableSecret = "Hello Person!";

    @Public
    shoot() {
        // pew
    }

    @Private
    shootPrivately() {
        // pew (privately)
    }

    _init() {
        setInterval(() => {
            this.power = Math.floor(Math.random() * 10000);
        }, 1000);
        setTimeout(() => {
            this.server.deleteEntity(this);
        }, 30000);
    }
}

const server = new Server({
    port: 8080,
    debug: true,
}).start();

server.on("connection", (user) => {
    const owned = server.createEntity(
        Player,
        { name: "You", power: 0 },
        user,
    );
    const notOwned = server.createEntity(Player, {
        name: "They",
        power: 0,
    });
});

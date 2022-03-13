import { Entity, Server } from "../../lib";

const server = new Server();

class TestEntity extends Entity {
    name = "Thales";
    power = 9001;

    _blah = 3;
}

// const test = new TestEntity({ server });

console.log(TestEntity.schema);
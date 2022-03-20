import { EntityConfig } from "../types";
import { Entity } from "./Entity";

class Base {
    public base = 1;
}

class Whatever {
    public whatever = true;
}

class Oxe {
    public oxe = false;
}

interface Base extends Whatever, Oxe {};

export {Base};

import { KeyValue } from "../types";

type Constructor = new (...args: any[]) => object;

export function Mixin<BaseClass extends Constructor>(base: BaseClass, traits: Constructor[]): BaseClass {
    let newConstructor = base;

    traits.forEach((trait) => {
        Object.getOwnPropertyNames(trait.prototype).forEach((name) => {
            Object.defineProperty(
                base.prototype,
                name,
                Object.getOwnPropertyDescriptor(trait.prototype, name) ||
                Object.create(null)
            );
        });
    });

    newConstructor = class extends base {
        constructor (...args: any[]) {
            super(...args);

            traits.forEach((trait) => {
                const dummy = new trait();

                Object.getOwnPropertyNames(dummy).forEach((name) => {
                    Object.defineProperty(
                        this,
                        name,
                        Object.getOwnPropertyDescriptor(dummy, name) ||
                        Object.create(null)
                    );
                });
            });
        }
    }

    return newConstructor;
}
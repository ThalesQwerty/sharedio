import { Server } from "../../sharedio";
import { Entity } from "../../sharedio";

export function ExtractDependencies(entityClass: typeof Entity, computedPropertyName: string): string[] {
    const propertyDescriptor = Object.getOwnPropertyDescriptor(entityClass.prototype, computedPropertyName);

    if (!propertyDescriptor || !propertyDescriptor.get || Entity.isDefaultAttribute(computedPropertyName)) return [];

    const dummy = new entityClass({server: Server.dummy, dummy: true});
    const attributes = Entity.attributes(dummy);

    const dependencies: string[] = [];

    for (const attributeName of attributes) {
        const currentDescriptor = Object.getOwnPropertyDescriptor(dummy, attributeName);
        const runGet = () => {
            if (currentDescriptor?.get) {
                const code = removeFlowControl(currentDescriptor.get.toString().replace("function ()", "if (true)"));
                eval(code);
            }
        }

        Object.defineProperty(dummy, attributeName, {
            get() {
                if (dependencies.indexOf(attributeName) < 0) dependencies.push(attributeName);
                if (currentDescriptor?.get) runGet.call(dummy);
            }
        });
    }

    (dummy as any)[computedPropertyName];

    return dependencies;
}

export function removeFlowControl(code: string) {
    code = code.replace(/\Wif(\s?)+\(/g, "if (true || ");
    code = code.replace(/\Welse/g, "if (true)");
    code = code.replace(/\Wcase(\s?)+".+":/g, "default:");
    // code = code.replace(/\Wfor\s+\(.+;.+;.+\)/g, "if (true)");
    // code = code.replace(/\Wfor\s+\(.+\s+in\s+.+\)/g, "if (true)");
    // code = code.replace(/\Wfor\s+\(.+\s+of\s+.+\)/g, "if (true)");
    code = code.replace(/\Wdo/g, "if (true)");
    code = code.replace(/\Wwhile(\s?)+\(/g, "if (true || ");
    code = code.replace(/\Wbreak\W/g, "if (true) 0;");
    code = code.replace(/\Wcontinue\W/g, "if (true) 0;");
    code = code.replace(/\Wreturn\W/g, "");

    return code;
}
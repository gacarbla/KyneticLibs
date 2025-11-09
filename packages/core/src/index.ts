import { AddAlias } from "./types";

export class KyneticLibCore<TAliases = {}> {
    private toolInstances: { [key: string]: any } = {};

    use<K extends string, C extends new (...args: any[]) => any, V = InstanceType<C>>(
        alias: K,
        ToolClass: C,
        ...args: ConstructorParameters<C>
    ): KyneticLibCore<AddAlias<TAliases, K, V>> {
        this.toolInstances[alias] = new ToolClass(...args);
        return this as unknown as KyneticLibCore<AddAlias<TAliases, K, V>>;
    }

    get tool(): TAliases {
        return this.toolInstances as TAliases;
    }
}

export default KyneticLibCore;
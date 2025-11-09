// =[ EN ]===========================================================================
//
//  CONTAINER
//  A simple container.
//
//  Developed by gacarbla
//  v1.0.0
//
// =[ ES ]===========================================================================
//
//  CONTAINER
//  Clase contenedora.
//
//  Desarrollado por gacarbla
//  v1.0.0
//
// =[ GL ]===========================================================================
//
//  CONTAINER
//  Contenedor.
//
//  Desenrolado por gacarbla
//  v1.0.0
//
// ==================================================================================


import { DynamicKeyTypes, KeyMap } from "./types";

export class BasicContainer<T = any> {
    private items: Map<string, T>;

    constructor() {
        this.items = new Map<string, T>();
    }

    set(key: string, value: T): this {
        this.items.set(key, value);
        return this;
    }

    get(key: string): T | undefined {
        return this.items.get(key) as T | undefined;
    }

    has(key: string): boolean {
        return this.items.has(key);
    }

    delete(key: string): boolean {
        return this.items.delete(key);
    }

    clear(): void {
        this.items.clear();
    }
}

export class StrictContainer<K extends KeyMap> {
    private items: Map<keyof K, K[keyof K]>;

    constructor() {
        this.items = new Map();
    }

    set<Key extends keyof K>(key: Key, value: K[Key]): this {
        this.items.set(key, value);
        return this;
    }

    get<Key extends keyof K>(key: Key): K[Key] | undefined {
        return this.items.get(key);
    }

    has<Key extends keyof K>(key: Key): boolean {
        return this.items.has(key);
    }

    delete<Key extends keyof K>(key: Key): boolean {
        return this.items.delete(key);
    }

    clear(): void {
        this.items.clear();
    }
}

export class DynamicContainer<K extends DynamicKeyTypes = {}> {
    private items: Map<string, unknown>;

    constructor(items?: Map<string, unknown>) {
        this.items = items ? new Map(items) : new Map();
    }

    addKey<Key extends string, T>(key: Key): DynamicContainer<K & { [P in Key]: T }> {
        const newContainer = new DynamicContainer<K & { [P in Key]: T }>(this.items);
        if (!newContainer.items.has(key)) {
            newContainer.items.set(key, undefined);
        }
        return newContainer;
    }

    set<Key extends keyof K>(key: Key, value: K[Key]): this {
        this.items.set(key as string, value);
        return this;
    }

    get<Key extends keyof K>(key: Key): K[Key] | undefined {
        return this.items.get(key as string) as K[Key] | undefined;
    }

    has<Key extends keyof K>(key: Key): boolean {
        return this.items.has(key as string);
    }

    delete<Key extends keyof K>(key: Key): boolean {
        return this.items.delete(key as string);
    }

    clear(): void {
        this.items.clear();
    }
}

export default {
    Basic: BasicContainer,
    Strict: StrictContainer,
    Dynamic: DynamicContainer,
};
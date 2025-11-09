// =[ EN ]===========================================================================
//
//  COUNTER
//  A simple counter.
//
//  Developed by gacarbla
//  v1.0.0
//
// =[ ES ]===========================================================================
//
//  COUNTER
//  Clase para contar números de forma sencilla.
//
//  Desarrollado por gacarbla
//  v1.0.0
//
// =[ GL ]===========================================================================
//
//  COUNTER
//  Clase para xestionar contas de forma sinxela.
//
//  Desenrolado por gacarbla
//  v1.0.0
//
// ==================================================================================

export class Counter {
    private x: number;
    constructor(initialValue: number = 0) {
        this.x = initialValue;
    }

    get value(): number {
        return this.x;
    }

    get next(): number {
        return ++this.x;
    }

    get previous(): number {
        return --this.x;
    }

    set(value: number): this {
        this.x = value;
        return this;
    }

    reset = (): this => this.set(0);
}

export default Counter;
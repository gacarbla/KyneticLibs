// =[ EN ]===========================================================================
//
//  CONTAINER
//  Typed key/value containers for shared application state.
//
//  Developed by gacarbla
//  v0.2.0
//
// =[ ES ]===========================================================================
//
//  CONTAINER
//  Contenedores tipados de clave/valor para estado compartido.
//
//  Desarrollado por gacarbla
//  v0.2.0
//
// =[ GL ]===========================================================================
//
//  CONTAINER
//  Contedores tipados de clave/valor para estado compartido.
//
//  Desenrolado por gacarbla
//  v0.2.0
//
// ==================================================================================

/**
 * `@kyneticweb/container`
 *
 * Three container flavours built on the same internal store:
 * `BasicContainer` for uniform values, `StrictContainer` for a fixed key
 * shape and `DynamicContainer` for a key shape that grows over time.
 *
 * @packageDocumentation
 */

export * from "./types.js";
export * from "./readonly-container.js";
export * from "./basic-container.js";
export * from "./strict-container.js";
export * from "./dynamic-container.js";

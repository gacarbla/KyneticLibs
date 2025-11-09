import * as fs from 'fs';

export type InputFormat =
    | 'string'
    | 'number'
    | 'boolean'
    | 'date'
    | 'object'
    | 'json'
    | 'stringDate'
    | 'stringDatePlaceholder'
    | 'yaml';

export type ObjectTypes =
    | 'object'
    | 'yaml'
    | 'string';

export type OutputFormat<F extends InputFormat> =
    F extends 'string' ? 'number' | 'boolean' | 'date' | ObjectTypes :
    F extends 'number' ? 'number' | 'string' | 'boolean' :
    F extends 'boolean' ? 'boolean' | 'string' | 'number' :
    F extends 'date' ? 'date' | 'string' | 'number' :
    F extends 'stringDate' ? 'date' | 'string' | 'number' :
    F extends 'stringDatePlaceholder' ? 'function' :
    F extends 'object' ? ObjectTypes :
    F extends 'json' ? ObjectTypes :
    F extends 'yaml' ? ObjectTypes :
    never;

export type InputType<F extends InputFormat> =
    F extends 'string' ? string :
    F extends 'stringDate' ? string :
    F extends 'stringDatePlaceholder' ? string :
    F extends 'number' ? number :
    F extends 'boolean' ? boolean :
    F extends 'date' ? Date :
    F extends 'object' ? Object :
    F extends 'json' ? fs.PathLike :
    F extends 'yaml' ? fs.PathLike :
    never;

export type OutputType<O extends OutputFormat<any>> =
    O extends 'string' ? string :
    O extends 'number' ? number :
    O extends 'boolean' ? boolean :
    O extends 'date' ? Date :
    O extends 'object' ? Record<string, any> :
    O extends 'json' ? Record<string, any> :
    O extends 'yaml' ? Record<string, any> :
    O extends 'function' ? (d: Date) => string :
    never;
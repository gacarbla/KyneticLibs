import {
    BooleanConverter,
    BooleanNumberConverter,
    DateConverter,
    DateNumberConverter,
    DateStringConverter,
    IdentityConverter,
    JsonConverter,
    JsonFileConverter,
    JsonStringConverter,
    NumberConverter,
    PatternFormatterConverter,
    PrimitiveStringConverter,
    RecordConverter,
    YamlConverter,
    YamlFileConverter,
    YamlStringConverter,
} from "./converters/index.js";
import { ConverterRegistry } from "./converter-registry.js";

/**
 * Builds a registry with every conversion supported by the parser.
 *
 * File formats (`json` and `yaml`) read the path they receive and then apply
 * the converter requested as output.
 *
 * @returns A registry ready to be used by {@link Parser}.
 * @example
 * ```ts
 * const registry = createDefaultConverterRegistry();
 * registry.size; // 28
 * ```
 */
export function createDefaultConverterRegistry(): ConverterRegistry {
    const registry = new ConverterRegistry();
    const identity = new IdentityConverter();
    const boolean = new BooleanConverter();
    const number = new NumberConverter();
    const date = new DateConverter();
    const json = new JsonConverter();
    const yaml = new YamlConverter();
    const text = new PrimitiveStringConverter();

    registry.register("string->string", identity);
    registry.register("string->number", number);
    registry.register("string->boolean", boolean);
    registry.register("string->date", date);
    registry.register("string->object", json);
    registry.register("string->yaml", yaml);

    registry.register("number->number", identity);
    registry.register("number->string", text);
    registry.register("number->boolean", boolean);

    registry.register("boolean->boolean", identity);
    registry.register("boolean->string", text);
    registry.register("boolean->number", new BooleanNumberConverter());

    registry.register("date->date", date);
    registry.register("date->string", new DateStringConverter());
    registry.register("date->number", new DateNumberConverter());

    registry.register("stringDate->date", date);
    registry.register("stringDate->string", identity);
    registry.register("stringDate->number", new DateNumberConverter());

    registry.register("datePattern->function", new PatternFormatterConverter());

    registry.register("object->object", identity);
    registry.register("object->yaml", new YamlStringConverter());
    registry.register("object->string", new JsonStringConverter());

    registry.register("json->object", new JsonFileConverter(new RecordConverter()));
    registry.register("json->yaml", new JsonFileConverter(new YamlStringConverter()));
    registry.register("json->string", new JsonFileConverter(new JsonStringConverter()));

    registry.register("yaml->object", new YamlFileConverter(new RecordConverter()));
    registry.register("yaml->yaml", new YamlFileConverter(new YamlStringConverter()));
    registry.register("yaml->string", new YamlFileConverter(new JsonStringConverter()));

    return registry;
}

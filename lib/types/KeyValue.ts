export type KeyValue<ValueType = any, KeyType extends string|number|symbol = string|number|symbol> = {
    [property in KeyType]?: ValueType;
};
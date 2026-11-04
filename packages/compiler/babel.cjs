"use strict";

/**
 * Kynetic JSX compiler (Babel plugin).
 *
 * The DOM runtime is fine-grained: a dynamic expression must be evaluated
 * inside an effect. This plugin wraps dynamic expressions in zero-argument
 * arrow functions (thunks), which the runtime executes inside an effect.
 *
 * Rules:
 *   - Intrinsic elements: dynamic attributes and children become thunks.
 *   - Components: attributes stay eager (pass an accessor for reactive props);
 *     children become thunks so a provider can resolve them under its context.
 *   - Event handlers, `ref`, `key` and literal values never become thunks.
 *   - Spread attributes are rejected with a clear error for now.
 */

/** Returns true when the expression must be evaluated inside an effect. */
function shouldWrap(expression) {
    if (!expression) {
        return false;
    }
    switch (expression.type) {
        case "JSXEmptyExpression":
        case "JSXElement":
        case "JSXFragment":
        case "StringLiteral":
        case "NumericLiteral":
        case "BooleanLiteral":
        case "NullLiteral":
        case "ArrowFunctionExpression":
        case "FunctionExpression":
            return false;
        default:
            return true;
    }
}

/** Wraps an expression in `() => expression`. */
function thunk(types, expression) {
    return types.arrowFunctionExpression([], expression);
}

/** Plugin factory. */
module.exports = function kyneticJsx(api) {
    const types = api.types;

    return {
        name: "kynetic-jsx",
        visitor: {
            JSXElement(path) {
                const opening = path.node.openingElement;
                const name = opening.name;
                const intrinsic = name.type === "JSXIdentifier" && /^[a-z]/.test(name.name);

                for (const attribute of opening.attributes) {
                    if (attribute.type === "JSXSpreadAttribute") {
                        // Spreads are allowed on components and on intrinsic
                        // elements. Dynamic values inside a spread are eager
                        // unless they are already thunks (functions); this is
                        // what form bindings provide.
                        continue;
                    }
                    if (!intrinsic) {
                        continue;
                    }
                    if (attribute.name.type !== "JSXIdentifier") {
                        continue;
                    }
                    const attributeName = attribute.name.name;
                    if (attributeName === "ref" || /^on[A-Z]/.test(attributeName)) {
                        continue;
                    }
                    const value = attribute.value;
                    if (value?.type === "JSXExpressionContainer" && shouldWrap(value.expression)) {
                        value.expression = thunk(types, value.expression);
                    }
                }

                for (let index = 0; index < path.node.children.length; index += 1) {
                    const child = path.node.children[index];
                    if (child.type === "JSXExpressionContainer") {
                        if (shouldWrap(child.expression)) {
                            child.expression = thunk(types, child.expression);
                        }
                        continue;
                    }
                    // Children of components are lazy so providers can resolve
                    // them inside their context.
                    if (!intrinsic && (child.type === "JSXElement" || child.type === "JSXFragment")) {
                        path.node.children[index] = types.jsxExpressionContainer(thunk(types, child));
                    }
                }
            },
        },
    };
};

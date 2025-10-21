/**
 * Simple template function to replace Underscore's _.template
 * Supports both interpolation {| |} and escaping {{ }}
 */

const templateSettings = {
    interpolate: /{|\|([\s\S]+?)\|}/g,
    escape: /{{([\s\S]+?)}}/g
};

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#x27;',
        '`': '&#x60;'
    };
    return String(text).replace(/[&<>"'`]/g, (match) => map[match]);
}

export function template(str) {
    // Replace escaped expressions
    const escaped = str.replace(templateSettings.escape, (match, code) => {
        return '\'+((__t=(' + code + '))==null?\'\':escapeHtml(__t))+\'';
    });

    // Replace interpolated expressions
    const interpolated = escaped.replace(templateSettings.interpolate, (match, code) => {
        return '\'+((__t=(' + code + '))==null?\'\':__t)+\'';
    });

    // Build the template function
    const source = 'var __t,__p=\'\';' +
        '__p+=\'' +
        interpolated
            .replace(/\\/g, '\\\\')
            .replace(/'/g, '\\\'')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r') +
        '\';' +
        'return __p;';

    const render = new Function('obj', 'escapeHtml', 
        'with(obj||{}){' + source + '}'
    );

    return function(data) {
        return render.call(this, data, escapeHtml);
    };
}

/**
 * Bind all methods to the given context
 * @param {Object} context - The context to bind to (usually 'this')
 * @param {...string} methodNames - Names of methods to bind
 */
export function bindAll(context, ...methodNames) {
    methodNames.forEach(methodName => {
        const original = context[methodName];
        if (typeof original === 'function') {
            context[methodName] = original.bind(context);
        }
    });
}


'use strict';
const path = require('path')

// -----------------------------------------------------------------------------

path.escape = function escape(str) {
    return (str.indexOf(' ') > 0) ? str.replace(/\\? /g,'\\ ') : str
}

path.quote = function quote(str) {
    if (str.startsWith("'") && str.endsWith("'")) return str
    if (str.startsWith('"') && str.endsWith('"')) return str
    return `"${str.replace(/"/g,'\\"')}"`
}

// -----------------------------------------------------------------------------

module.exports = path

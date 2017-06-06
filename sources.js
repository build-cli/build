'use strict';
const fs   = require('./fs')
const glob = require('glob')

// -----------------------------------------------------------------------------

const globopts = { nocase:true, strict:true }

function sources(...patterns) {
    const sources = {}
    for (let pattern of patterns) {
        const sourcePaths = glob.sync(pattern,globopts)
        for (let sourcePath of sourcePaths) {
            sources[sourcePath] = null
        }
    }
    return sources
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze(sources)
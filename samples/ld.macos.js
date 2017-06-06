'use strict';
const clang = require('./clang')
const path  = require('path')

// -----------------------------------------------------------------------------

const { escape, join } = path

// -----------------------------------------------------------------------------

const DIAGNOSTIC = /^\w.*$/
const DETAIL = /^\s+.*$/

function parseDiagnostics(stderr) {
    const lines = stderr.split('\n')
    if (lines.last && lines.last.match(/^clang:/)) {
        lines.pop()
    }
    if (lines.last && lines.last.match(/^ld:/)) {
        lines.pop()
    }
    const diagnostics = []
    for (let line of lines) {
        if (line.match(DIAGNOSTIC)) {
            const status  = 'error'
            const message = line
            diagnostics.push({message})
            continue
        }
        if (line.match(DETAIL)) {
            const diagnostic = diagnostics.last
            diagnostic.message += '\n'+line
            continue
        }
    }
    return diagnostics
}

// -----------------------------------------------------------------------------

function digest(status,stdout,stderr) {
    return {
        dependencies:[],
        diagnostics:parseDiagnostics(stderr),
    }
}

// -----------------------------------------------------------------------------

const LDFLAGS = [
    '-lc++',
]

function ld(outname,config,sources) {
    const inpaths = Object.keys(sources).map(escape).join(' ')
    const outpath = join(config.cachedir,'bin',outname)
    const name = `link ${outname}`
    const ld = clang(config)
    const ldflags = LDFLAGS.concat(config.ldflags||[]).join(' ')
    const command = `${ld} ${ldflags} -o ${escape(outpath)} ${inpaths}`
    return { [outpath]:{name,command,sources,digest} }
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze(ld)
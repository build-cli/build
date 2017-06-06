'use strict';
const clang = require('./clang')
const path  = require('path')
const vcvars = require('./vcvars')

// -----------------------------------------------------------------------------

const { join,  quote } = path

// -----------------------------------------------------------------------------

function digest(status,stdout,stderr) {
    if (status.code || status.signal) {
        print({status,stdout,stderr})
    }
    return {
        dependencies:[],
        diagnostics:[],
    }
}

// -----------------------------------------------------------------------------

const LDFLAGS = [
    '/nologo',
    '/NODEFAULTLIB:User32.lib',
]

function ld(outname,config,sources) {
    const {bin,lib} = vcvars(config)
    const inpaths = Object.keys(sources).map(quote).join(' ')
    const outpath = join(config.cachedir,'bin',outname+'.exe')
    const name = `link ${outname}`
    const ld = join(bin,'link')
    const libpaths = lib.map(lib=>`/LIBPATH:${quote(lib)}`).join(' ')
    const ldflags = LDFLAGS.concat(libpaths,config.ldflags||[]).join(' ')
    const command = `${quote(ld)} ${ldflags} /OUT:${quote(outpath)} ${inpaths}`
    return { [outpath]:{name,command,sources,digest} }
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze(ld)
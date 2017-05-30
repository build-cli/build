'use strict';
const clang = require('./clang')
const path  = require('path')
const vcvars = require('./vcvars')

// -----------------------------------------------------------------------------

const {
    join,
    quote,
} = path

// -----------------------------------------------------------------------------

function ld(outname,config,sources) {
    const {bin,lib} = vcvars(config)
    const inpaths = Object.keys(sources).map(quote).join(' ')
    const outpath = join(config.cachedir,'bin',outname+'.exe')
    const name = `link ${outname}`
    const ld = join(bin,'link')
    const libpaths = '/LIBPATH:'+lib.map(quote).join(' /LIBPATH:')
    const ldflags = (config.ldflags||[]).join(' ')
    const command = `${quote(ld)} /nologo ${ldflags} ${libpaths} /OUT:${quote(outpath)} ${inpaths}`
    return { [outpath]:{name,command,sources} }
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze(ld)
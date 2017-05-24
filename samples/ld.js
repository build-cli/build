'use strict';
const clang = require('./clang')
const path  = require('path')

// -----------------------------------------------------------------------------

const {
    basename,
    escape,
    join,
} = path

// -----------------------------------------------------------------------------

function ld(outname,config,sources) {
    const inpaths = Object.keys(sources).map(escape).join(' ')
    const outpath = join(config.cachedir,'bin',outname)
    const name = `link ${outname}`
    const ld = clang(config)
    const ldflags = config.ldflags
    const command = (ldflags)
        ?`${ld} -lc++ ${ldflags} -o ${outpath} ${inpaths}`
        :`${ld} -lc++ -o ${outpath} ${inpaths}`
    return { [outpath]:{name,command,sources} }
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze(ld)
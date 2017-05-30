'use strict';
const clang = require('./clang')
const path  = require('path')

// -----------------------------------------------------------------------------

const {
    escape,
    join,
} = path

// -----------------------------------------------------------------------------

function ld(outname,config,sources) {
    const inpaths = Object.keys(sources).map(escape).join(' ')
    const outpath = escape(join(config.cachedir,'bin',outname))
    const name = `link ${outname}`
    const ld = clang(config)
    const ldflags = (config.ldflags||[]).concat('-lc++').join(' ')
    const command = `${ld} ${ldflags} /OUT ${outpath} ${inpaths}`
    return { [outpath]:{name,command,sources} }
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze(ld)
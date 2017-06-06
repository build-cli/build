const fs   = require('./fs')
const glob = require('glob')

// -----------------------------------------------------------------------------

const realpath = fs.realpathSync

// -----------------------------------------------------------------------------

function includeFile(filename) {
    require(realpath(filename))
}

// -----------------------------------------------------------------------------

const PATTERN  = /(?:[*]|[?]|[[]|[!?+*@][(])+/
const globopts = {nocase:true,strict:true}

function includePattern(pattern) {
    if (pattern.match(PATTERN)) {
        const filenames = glob.sync(pattern,globopts)
        for (let filename of filenames) {
            includeFile(filename)
        }
    } else {
        includeFile(pattern)
    }
}

// -----------------------------------------------------------------------------

function includes(pattern,...patterns) {
    includePattern(pattern)
    for (let pattern of patterns) {
        includePattern(pattern)
    }
}

// -----------------------------------------------------------------------------

module.exports = includes
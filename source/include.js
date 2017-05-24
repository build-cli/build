const glob      = require('glob')
const fs        = require('./fs')
const os        = require('os')
const path      = require('./path')
const utilities = require('./utilities')

// -----------------------------------------------------------------------------

const {
    isEmpty,
    isString,
    pushd,
} = utilities

const realpath = fs.realpathSync

// -----------------------------------------------------------------------------

const included  = new Set()
const dirnames  = []
const filenames = []
const globopts  = { nocase:true, strict:true }

function includefile(filename) {
    const dirname = path.dirname(filename)
    const fullpath = realpath(filename)
    if (included.has(fullpath)) {
        return
    }
    included.add(fullpath)
    try {
        dirnames.push(dirname)
        filenames.push(filename)
        return pushd(dirname,()=>require(fullpath))
    } finally {
        dirnames.pop()
        filenames.pop()
    }
}

function include(...patterns) {
    for (let pattern of patterns) {
        let filenames = glob.sync(pattern,globopts)
        for (let filename of filenames) {
            includefile(filename)
        }
    }
}

Object.defineProperties(include,{
    included:{get(){return included},enumerable:true},
    dirname:{get(){return dirnames[dirnames.length-1]},enumerable:true},
    dirnames:{get(){return dirnames},enumerable:true},
    filename:{get(){return filenames[filenames.length-1]},enumerable:true},
    filenames:{get(){return filenames},enumerable:true},
})

// -----------------------------------------------------------------------------

module.exports = include
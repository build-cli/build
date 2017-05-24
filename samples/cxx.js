'use strict';
const fs    = require('fs')
const path  = require('path')
const clang = require('./clang')

// -----------------------------------------------------------------------------

const DEPENDENCY_REGEXP = /(?:[^ \\\n]|\\ )+/g

function parseDependencies(dependencies) {
    dependencies = dependencies.match(DEPENDENCY_REGEXP)
    dependencies.shift() // discard path to objfile
    dependencies.shift() // discard path to srcfile
    const dependencyCount = dependencies.length
    for (let i = 0; i < dependencyCount; ++i) {
        const d = dependencies[i]
        if (d.includes('\\')) {
            // unescape spaces
            dependencies[i] = d.replace(/\\/g,'')
        }
    }
    return dependencies
}

function parseDependencyFile(filename) {
    return parseDependencies(fs.readFileSync(filename,'utf8'))
}

function consumeDependencyFile(filename) {
    const dependencies = parseDependencyFile(filename)
    fs.unlink(filename)
    return dependencies
}

// -----------------------------------------------------------------------------

function cxx(config,sources) {
    const cxxflags = (config.cxxflags||[]).join(' ')
    const cxx = clang(config)
    const compile = `${cxx} -MMD ${cxxflags}`
    const tree = {}
    for (let sourcePath in sources) {
        const srcfile = path.escape(sourcePath)
        const tmppath = path.join(config.cachedir,'obj',srcfile)
        const objfile = path.escape(`${tmppath}.o`)
        const depfile = `${tmppath}.d`
        tree[objfile] = {
            name:`compile ${sourcePath}`,
            command:`${compile} -o ${objfile} -c ${srcfile}`,
            sources:{ [sourcePath]:sources[sourcePath] },
            dependencies() { return parseDependencyFile(depfile) },
        }
    }
    return tree
}

// -----------------------------------------------------------------------------

const CXX_GLOB = '**/*.@(c|cc|cpp|cxx|c++|m|mm)'

cxx.sources = function cxx_sources(/*optional*/dir) {
    return sources(dir ? path.join(dir,CXX_GLOB) : CXX_GLOB)
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze(cxx)
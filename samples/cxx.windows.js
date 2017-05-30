'use strict';
const fs     = require('fs')
const path   = require('path')
const vcvars = require('./vcvars')

// -----------------------------------------------------------------------------

const {
    join,
    quote,
} = path

// -----------------------------------------------------------------------------

function parseDependencies(stdout,systemIncludeDirs) {
    const lines = stdout.split(/[\r\n]+/)
    const dependencies = []
    for (let line of lines) {
        const match = line.match(/Note: including file:\s+(.*)/)
        if (match) {
            const dependency = match[1]
            dependencies.push(dependency)
            for (let dir of systemIncludeDirs) {
                if (dependency.startsWith(dir)) {
                    dependencies.pop()
                    break
                }
            }
        }
    }
    return dependencies
}

// -----------------------------------------------------------------------------

const CXXFLAGS = [
    '/nologo',
    '/showIncludes',
    '/EHsc',   // standard C++ exception handling
    '/WX',     // warnings as errors
    '/wd4068', // disable warning: unknown pragma
]

function cxx(config,sources) {
    const {bin,include,lib} = vcvars(config)
    const cxxflags = (config.cxxflags||[]).concat(CXXFLAGS).join(' ')
    const cxx      = join(bin,'cl')
    const iflags   = '/I'+include.map(quote).join(' /I')
    const compile  = `${quote(cxx)} ${cxxflags} ${iflags}`
    const productions = {}
    for (let sourcePath in sources) {
        const srcfile = sourcePath
        const objpath = join(config.cachedir,'obj',srcfile)
        const objfile = `${objpath}.o`
        productions[objfile] = {
            name:`compile ${sourcePath}`,
            command:`${compile} /Fo${quote(objfile)} /c ${quote(srcfile)}`,
            sources:{ [sourcePath]:sources[sourcePath] },
            dependencies(stdout,stderr) {
                return parseDependencies(stdout,include)
            }
        }
    }
    return productions
}

// -----------------------------------------------------------------------------

const CXX_GLOB = '**/*.@(c|cc|cpp|cxx|c++)'

cxx.sources = function cxx_sources(/*optional*/dir) {
    return sources(dir ? path.join(dir,CXX_GLOB) : CXX_GLOB)
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze(cxx)
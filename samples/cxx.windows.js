'use strict';
const fs     = require('fs')
const path   = require('path')
const vcvars = require('./vcvars')

// -----------------------------------------------------------------------------

const realpath = fs.realpathSync

const { join, quote } = path

// -----------------------------------------------------------------------------

const DEPENDENCY = /Note: including file:\s+(.*)/
const DIAGNOSTIC = /([^(]+)\((\d+)(?:,(\d+))?\): ((?:error)|(?:warning)) ([A-Z]\d{4}: .*)/

function digest(status,stdout,stderr,systemIncludeDirs) {
    const lines = stdout.split(/[\r\n]+/)
    const dependencies = []
    const diagnostics = []
    for (let line of lines) {
        const dependency = line.match(DEPENDENCY)
        if (dependency) {
            const file = dependency[1]
            dependencies.push(file)
            for (let dir of systemIncludeDirs) {
                if (file.startsWith(dir)) {
                    dependencies.pop()
                    break
                }
            }
            continue
        }
        const diagnostic = line.match(DIAGNOSTIC)
        if (diagnostic) {
            const file    = realpath(diagnostic[1])
            const line    = parseInt(diagnostic[2])
            const column  = parseInt(diagnostic[3]||'0')
            const status  = diagnostic[4]
            const message = diagnostic[5]
            diagnostics.push({file,line,column,status,message})
            continue
        }
    }
    return { dependencies, diagnostics }
}

// -----------------------------------------------------------------------------

const CLFLAGMAP = {
    ['-g']:'/DEBUG /Z7',
    ['-O2']:'/O2',
}

function clflags(config) {
    const flags = config.cxxflags||[]
    const length = flags.length
    for (let i = 0; i < length; ++i) {
        let flag = CLFLAGMAP[flags[i]]
        if (flag) {
            flags[i] = flag
        }
    }
    return flags
}

// -----------------------------------------------------------------------------

const CLFLAGS = [
    '/nologo',
    '/showIncludes',
    '/EHsc',       // standard C++ exception handling
    '/FIiso646.h', // standard C++ keywords, 'and', 'or', etc.
    '/WX',         // warnings as errors
    '/wd4068',     // disable warning: unknown pragma
]

function cxx(config,sources) {
    const {bin,include,lib} = vcvars(config)
    const iflags      = include.map(x=>`/I${quote(x)}`).join(' ')
    const cxxflags    = CLFLAGS.concat(clflags(config),iflags).join(' ')
    const cxx         = join(bin,'cl')
    const compile     = `${quote(cxx)} ${cxxflags} ${iflags}`
    const productions = {}
    for (let sourcePath in sources) {
        const srcfile = sourcePath
        const objpath = join(config.cachedir,'obj',srcfile)
        const objfile = `${objpath}.o`
        const name    = `compile ${sourcePath}`
        const command = `${compile} /Fo${quote(objfile)} /c ${quote(srcfile)}`
        productions[objfile] = {
            name, command,
            sources:{ [sourcePath]:sources[sourcePath] },
            digest(status,stdout,stderr) {
                return digest(status,stdout,stderr,include)
            },
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
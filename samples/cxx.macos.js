'use strict';
const fs    = require('fs')
const path  = require('path')
const clang = require('./clang')

// -----------------------------------------------------------------------------

const exists   = fs.existsSync
const read     = fs.readFileSync
const unlink   = fs.unlinkSync
const realpath = fs.realpathSync

const { escape, join } = path

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
    return parseDependencies(read(filename,'utf8'))
}

function consumeDependencyFile(filename) {
    if (exists(filename)) {
        const dependencies = parseDependencyFile(filename)
        process.nextTick(unlink,filename)
        return dependencies
    }
    return []
}

// -----------------------------------------------------------------------------

const DIAGNOSTIC = /([^:]+):(\d+):(\d+): ((?:error)|(?:warning)): (.*)/

function parseDiagnostics(stderr) {
    const lines = stderr.split('\n')
    if (lines.last && lines.last.match(/^\d+ errors generated$/)) {
        lines.pop()
    }
    const diagnostics = []
    for (let line of lines) {
        const diagnostic = line.match(DIAGNOSTIC)
        if (diagnostic) {
            const file    = realpath(diagnostic[1])
            const line    = parseInt(diagnostic[2])
            const column  = parseInt(diagnostic[3])
            const status  = diagnostic[4] // 'warning' or 'error'
            const message = diagnostic[5]
            diagnostics.push({file,line,column,status,message})
        }
    }
    return diagnostics
}

// -----------------------------------------------------------------------------

function digest(status,stdout,stderr,depfile) {
    return {
        dependencies:consumeDependencyFile(depfile),
        diagnostics:parseDiagnostics(stderr),
    }
}

// -----------------------------------------------------------------------------

const CXXFLAGS = [
    '-MMD',
]

function cxx(config,sources) {
    const cxxflags = CXXFLAGS.concat(config.cxxflags||[]).join(' ')
    const cxx = clang(config)
    const compile = `${cxx} ${cxxflags}`
    const productions = {}
    for (let sourcePath in sources) {
        const srcfile = sourcePath
        const objpath = join(config.cachedir,'obj',srcfile)
        const objfile = `${objpath}.o`
        const depfile = `${objpath}.d`
        productions[objfile] = {
            name:`compile ${sourcePath}`,
            command:`${compile} -o ${escape(objfile)} -c ${escape(srcfile)}`,
            sources:{ [sourcePath]:sources[sourcePath] },
            digest(status,stdout,stderr) {
                return digest(status,stdout,stderr,depfile)
            },
        }
    }
    return productions
}

// -----------------------------------------------------------------------------

const CXX_GLOB = '**/*.@(c|cc|cpp|cxx|c++|m|mm)'

cxx.sources = function cxx_sources(/*optional*/dir) {
    return sources(dir ? path.join(dir,CXX_GLOB) : CXX_GLOB)
}

// -----------------------------------------------------------------------------

module.architectures = 
module.exports = Object.freeze(cxx)
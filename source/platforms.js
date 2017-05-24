'use strict';
const include   = require('./include')
const os        = require('os')
const utilities = require('./utilities')

// -----------------------------------------------------------------------------

const {
    isObject,
    isDefined,
} = utilities

// -----------------------------------------------------------------------------

const $filename = Symbol('$filename')

// -----------------------------------------------------------------------------

class Platforms {
    constructor(definitions) {
        for (let name in definitions) {
            const definition = definitions[name]
            Platforms.set(this,name,definition)
        }
        return new Proxy(this,Platforms)
    }

    static set(platforms,name,definition) {
        const oldPlatform = platforms[name]
        if (isDefined(oldPlatform)) {
            const newFilename = include.filename
            const oldFilename = oldPlatform[$filename]
            console.error(
                `cannot replace platforms.${name}\n`+
                `    defined here: ${oldFilename}\n`+
                `    redefined here: ${newFilename}`
            )
            process.exit(1)
            return false
        }
        if (!isObject(definition)) {
            console.error(
                `invalid definition for platforms.${name}, `+
                `expected object`
            )
            process.exit(1)
            return false
        }
        definition.name = name
        definition[$filename] = include.filename
        Object.freeze(definition)
        platforms[name] = definition
        return true
    }

    static deleteProperty(platforms,name) {
        const oldPlatform = platforms[name]
        if (isDefined(oldPlatform)) {
            const oldFilename = oldPlatform.filename
            console.error(
                `cannot delete platforms.${name}\n`+
                `    defined here: ${oldFilename}`
            )
            process.exit(1)
        }
        return false
    }
}
Object.freeze(Platforms)

// -----------------------------------------------------------------------------

const platforms = new Platforms({
    android:{
        architectures:{arm,arm64,x86,x86_64}
    },
    ios:{
        architectures:{arm,arm64,x86,x86_64}
    },
    macos:{
        architectures:{x86,x86_64}
    },
    windows:{
        architectures:{arm,arm64,x86,x86_64}
    },
    linux:{
        architectures:{arm,arm64,mips,mipsel,ppc,ppc64,s390,s390x,x86,x86_64}
    },
})

// -----------------------------------------------------------------------------

const HOST_PLATFORMS = Object.freeze({
        aix:'aix',
    android:'android',
        ios:'ios',
     darwin:'macos',
    freebsd:'freebsd',
      linux:'linux',
        mac:'macos',
      macos:'macos',
     macosx:'macos',
    openbsd:'openbsd',
      sunos:'sunos',
      win32:'windows',
})

const host = HOST_PLATFORMS[os.platform()]

Object.defineProperty(platforms,'host',{get(){ return host }})

// -----------------------------------------------------------------------------

module.exports = platforms
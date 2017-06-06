'use strict';
const os        = require('os')
const utilities = require('./utilities')

// -----------------------------------------------------------------------------

const {
    caller,
    isObject,
    isDefined,
} = utilities

// -----------------------------------------------------------------------------

const $filename = Symbol('$filename')

// -----------------------------------------------------------------------------

class Architectures {
    constructor(definitions) {
        for (let name in definitions) {
            const definition = definitions[name]
            Architectures.set(this,name,definition)
        }
        return new Proxy(this,Architectures)
    }

    static set(architectures,name,definition) {
        const filename = caller()
        const oldArchitecture = architectures[name]
        if (isDefined(oldArchitecture)) {
            const newFilename = filename
            const oldFilename = oldArchitecture[$filename]
            error(
                `cannot replace architectures.${name}\n`+
                `    defined here: ${oldFilename}\n`+
                `    redefined here: ${newFilename}`
            )
            process.exit(1)
            return false
        }
        if (!isObject(definition)) {
            error(
                `expected object for architectures.${name}`
            )
            process.exit(1)
            return false
        }
        definition.name = name
        definition[$filename] = filename
        Object.freeze(definition)
        architectures[name] = definition
        Object.defineProperty(global,name,{
            get(){return definition},enumerable:true
        })
        return true
    }

    static deleteProperty(architectures,name) {
        const oldArchitecture = architectures[name]
        if (isDefined(oldArchitecture)) {
            const oldFilename = oldArchitecture.filename
            console.error(
                `cannot delete architectures.${name}\n`+
                `    defined here: ${oldFilename}`
            )
            process.exit(1)
        }
        return false
    }
}
Object.freeze(Architectures)

// -----------------------------------------------------------------------------

const architectures = new Architectures({
    arm:{},
    arm64:{},
    mips:{},
    mipsel:{},
    ppc:{},
    ppc64:{},
    s390:{},
    s390x:{},
    x86:{},
    x86_64:{},
})

// -----------------------------------------------------------------------------

const HOST_ARCHITECTURES = Object.freeze({
           arm:'arm',
         arm64:'arm64',
          ia32:'ia32',
          mips:'mips',
        mipsel:'mipsel',
           ppc:'ppc',
         ppc64:'ppc64',
          s390:'s390',
         s390x:'s390x',
           x32:'x86',
           x64:'x86_64',
        x86_64:'x86_64',
    ['x86-64']:'x86_64',
           x86:'x86',
})

const host = HOST_ARCHITECTURES[os.arch()]

Object.defineProperty(architectures,'host',{get(){return host}})

// -----------------------------------------------------------------------------

module.exports = architectures

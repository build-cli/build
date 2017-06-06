'use strict';
const BuildTarget = require('./buildtarget')
const utilities   = require('./utilities')

// -----------------------------------------------------------------------------

const {
    caller,
    isDefined,
    isObject,
} = utilities

// -----------------------------------------------------------------------------

class BuildTargets {
    constructor() { return new Proxy(this,BuildTargets) }

    static set(targets,name,definition) {
        const filename = caller()
        const oldTarget = targets[name]
        if (isDefined(oldTarget)) {
            const newFilename = filename
            const oldFilename = oldTarget.filename
            console.error(
                `cannot replace targets.${name}\n`+
                `    defined here: ${oldFilename}\n`+
                `    redefined here: ${newFilename}`
            )
            process.exit(1)
            return false
        }
        if (!isObject(definition)) {
            const newFilename = filename
            console.error(
                `expected object for targets.${name}\n`+
                `    defined here: ${newFilename}`
            )
            process.exit(1)
            return false
        }
        const newTarget = new BuildTarget(name,filename,definition)
        targets[name] = newTarget
        return true
    }

    static deleteProperty(targets,name) {
        const oldTarget = targets[name]
        if (isDefined(oldTarget)) {
            const oldFilename = oldTarget.filename
            console.error(
                `cannot delete targets.${name}\n`+
                `    defined here: ${oldFilename}`
            )
            process.exit(1)
        }
        return false
    }

    *[Symbol.iterator]() {
        for (let key in this) {
            yield this[key]
        }
    }
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze(BuildTargets)
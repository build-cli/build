'use strict';
const BuildTarget = require('./buildtarget')
const include     = require('./include')
const utilities   = require('./utilities')

// -----------------------------------------------------------------------------

const {
    isDefined,
    isObject,
} = utilities

// -----------------------------------------------------------------------------

class BuildTargets {
    constructor() { return new Proxy(this,BuildTargets) }

    static set(targets,name,definition) {
        const oldTarget = targets[name]
        if (isDefined(oldTarget)) {
            const newFilename = include.filename
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
            const newFilename = include.filename
            console.error(
                `expected object for targets.${name}\n`+
                `    defined here: ${newFilename}`
            )
            process.exit(1)
            return false
        }
        const newTarget = new BuildTarget(name,definition)
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
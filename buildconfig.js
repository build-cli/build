'use strict';
const path      = require('./path')

// -----------------------------------------------------------------------------

class BuildConfig {
    constructor(
        name,
        targetName,       target,
        productName,      product,
        platformName,     platform,
        architectureName, architecture,
        variantName,      variant
    ) {
        const buildroot = path.relative(target.dirname,global.builddir)
        const builddir = path.join(buildroot,name)

        const cacheroot = path.relative(target.dirname,global.cachedir)
        const cachedir = path.join(cacheroot,name)

        this.name         = name
        this.builddir     = builddir
        this.cachedir     = cachedir
        this.target       = targetName
        this.product      = productName
        this.platform     = platformName
        this.architecture = architectureName
        if (variantName !== undefined) {
            this.variant  = variantName
        }

        const config = target.config
        for (let key in config) {
            if (key === 'name') continue
            console.assert(this[key] === undefined,`duplicate key ${key}`)
            this[key] = config[key]
        }
        for (let key in platform) {
            if (key === 'name') continue
            if (key === 'architectures') continue
            console.assert(this[key] === undefined,`duplicate key ${key}`)
            this[key] = platform[key]
        }
        for (let key in architecture) {
            if (key === 'name') continue
            console.assert(this[key] === undefined,`duplicate key ${key}`)
            this[key] = architecture[key]
        }
        if (variant !== undefined) {
            for (let key in variant) {
                if (key === 'name') continue
                console.assert(this[key] === undefined,`duplicate kye ${key}`)
                this[key] = variant[key]
            }
        }
        return Object.freeze(this)
    }
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze(BuildConfig)
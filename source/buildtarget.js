'use strict';
const BuildConfig = require('./buildconfig')
const include     = require('./include')
const utilities   = require('./utilities')

// -----------------------------------------------------------------------------

const {
    isEmpty,
    isString,
    pushd,
} = utilities

// -----------------------------------------------------------------------------

const NONE = Object.freeze({})

// -----------------------------------------------------------------------------

class BuildTarget {
    constructor(name,definition) {
        this.name      = name
        this.dirname   = include.dirname
        this.filename  = include.filename
        this.aliases   = definition.aliases||NONE
        this.config    = definition.config||NONE
        this.products  = definition.products||NONE
        this.platforms = definition.platforms||global.platforms
        this.variants  = definition.variants||NONE
        return Object.freeze(this)
    }

    get configs() {
        const configs    = {}
        const target     = this
        const aliases    = this.aliases
        const products   = this.products
        const platforms  = this.platforms
        const variants   = this.variants
        const targetName = this.name
        for (let aliasName in aliases) {
            const configName = aliases[aliasName]
            Object.defineProperty(configs,aliasName,{
                get(){ return configs[configName] },
                enumerable:true,
            })
        }
        for (let productName in products) {
            const product = products[productName]
            for (let platformName in platforms) {
                const platform = platforms[platformName]
                const architectures = (
                    platforms[platformName].architectures ||
                    global.platforms[platformName].architectures
                )
                for (let architectureName in architectures) {
                    const architecture = architectures[architectureName]
                    if (isEmpty(variants)) {
                        const configName = [
                            targetName,
                            productName,
                            platformName,
                            architectureName,
                        ].join('.')
                        Object.defineProperty(configs,configName,{
                            get(){
                                return new BuildConfig(
                                    configName,
                                    targetName,       target,
                                    productName,      product,
                                    platformName,     platform,
                                    architectureName, architecture,
                                )
                            },
                            enumerable:true,
                        })
                    } else for (let variantName in variants) {
                        const variant = variants[variantName]
                        const configName = [
                            targetName,
                            productName,
                            platformName,
                            architectureName,
                            variantName,
                        ].join('.')
                        Object.defineProperty(configs,configName,{
                            get(){
                                return new BuildConfig(
                                    configName,
                                    targetName,       target,
                                    productName,      product,
                                    platformName,     platform,
                                    architectureName, architecture,
                                    variantName,      variant
                                )
                            },
                            enumerable:true,
                        })
                    }
                }
            }
        }
        return Object.freeze(configs)
    }
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze(BuildTarget)
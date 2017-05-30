'use strict';
const path = require('path')

// -----------------------------------------------------------------------------

const CLANG_ARCHNAMES = Object.freeze({
       arm:'armv7',
     armv7:'armv7',
     arm64:'arm64',
       x86:'i386',
    x86_64:'x86_64',
})

// -----------------------------------------------------------------------------

const XCRUN_SDKNAMES = Object.freeze({
      ios:'iphoneos',
    macos:'macosx',
})

const XCRUN_CACHE = {}

function xcrun(config) {
    const sdkname = XCRUN_SDKNAMES[config.platform]
    let xcrun = XCRUN_CACHE[sdkname]
    if (xcrun === undefined) {
        const clang = shell(`xcrun --sdk ${sdkname} --find clang`)
        const sdk   = shell(`xcrun --sdk ${sdkname} --show-sdk-path`)
        XCRUN_CACHE[sdkname] = xcrun = { clang,sdk }
    }
    return xcrun
}

// -----------------------------------------------------------------------------

function clang(config) {
    const { clang, sdk } = xcrun(config)
    const archname  = CLANG_ARCHNAMES[config.architecture]
    const std       = '--std=c++11'
    const stdlib    = '-stdlib=libc++'
    return `${clang} -isysroot ${sdk} -arch ${archname} ${std} ${stdlib}`
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze(clang)

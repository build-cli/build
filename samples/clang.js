'use strict';
const path = require('path')

// -----------------------------------------------------------------------------

const CLANG_ARCH_NAMES = Object.freeze({
           arm:'armv7',
         armv7:'armv7',
         arm64:'arm64',
           x86:'i386',
        x86_64:'x86_64',
    ['x86-64']:'x86_64',
})

// -----------------------------------------------------------------------------

const XCRUN_SDK_NAMES = Object.freeze({
      ios:'iphoneos',
    macos:'macosx',
})

const XCRUN_CACHE = {}

// -----------------------------------------------------------------------------

const COMPACT = false

function clang(config) {
    const archname = CLANG_ARCH_NAMES[config.architecture]
    const sdkname = XCRUN_SDK_NAMES[config.platform]
    if (COMPACT) {
        // this command is a shorter and equivalent, however,
        // the full path to clang must be determined during
        // every call to xcrun, so it may be slower.
        // also, this command does not capture the clangpath
        // and sdkpath which could change between builds.
        return `xcrun --sdk ${sdkname} clang -arch ${archname}`
    } else {
        const sdk    = shell(`xcrun --sdk ${sdkname} --show-sdk-path`,XCRUN_CACHE)
        const clang  = shell(`xcrun --sdk ${sdkname} --find clang`,XCRUN_CACHE)
        const std    = '--std=c++11'
        const stdlib = '-stdlib=libc++'
        return `${clang} -isysroot ${sdk} -arch ${archname} ${std} ${stdlib}`
    }
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze(clang)

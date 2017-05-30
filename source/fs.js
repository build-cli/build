'use strict';
const path = require('./path')
const fs   = require('fs')

// -----------------------------------------------------------------------------

fs.isDirectorySync = function isDirectorySync(dir) {
    try {
        const stat = fs.statSync(dir)
        return stat.isDirectory()
    } catch (e) {}
    return false
}

// -----------------------------------------------------------------------------

fs.isFileSync = function isFileSync(dir) {
    try {
        const stat = fs.statSync(dir)
        return stat.isFile()
    } catch (e) {}
    return false
}

// -----------------------------------------------------------------------------

fs.mkdirpSync = function mkdirpSync(dir) {
    if (fs.existsSync(dir)) {
        return false
    }
    const parent = path.dirname(dir)
    if (parent != dir) {
        mkdirpSync(parent)
    }
    try {
        fs.mkdirSync(dir)
    } catch (e) {
        print(e)
    }
    return true
}

// -----------------------------------------------------------------------------

fs.mtimeSync = function mtimeSync(filename) {
    try {
        const fullpath = path.resolve(filename)
        const stats = fs.statSync(filename)
        return stats.mtime.getTime()
    } catch (e) {}
    return undefined
}

// -----------------------------------------------------------------------------

module.exports = fs

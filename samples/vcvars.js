'use strict';
const fs    = require('fs')
const path  = require('path')

// -----------------------------------------------------------------------------

const exists = fs.existsSync
const isdir = fs.isDirectorySync

const {
    dirname,
    join,
    quote,
} = path

// -----------------------------------------------------------------------------

function regquery(key) {
    function normalizeKey(key) {
        return (
            key
            .replace(/[/]/g,'\\')
            .replace('HKEY_CLASSES_ROOT','HKCR')
            .replace('HKEY_CURRENT_CONFIG','HKCC')
            .replace('HKEY_CURRENT_USER','HKCU')
            .replace('HKEY_LOCAL_MACHINE','HKLM')
            .replace('HKEY_USERS','HKU')
        )
    }
    key = normalizeKey(key)
    const values = {}
    try {
        const output = shell(`reg query ${key}`)
        const lines = output.split(/[\r\n]+/)
        lines.shift() // discard key
        for (let line of lines) {
            const parts = line.trim().split(/\s\s\s\s(REG_[A-Z]+)\s\s\s\s/)
            const name = parts[0]
            const type = parts[1]
            const value = parts[2]
            switch (type) {
                case 'REG_SZ':{
                    values[name] = value
                } break
                case 'REG_MULTI_SZ':{
                    values[name] = value.split('\0')
                } break
                case 'REG_EXPAND_SZ':{
                    // todo: expand environment variables
                    values[name] = value
                } break
                case 'REG_DWORD':{
                    values[name] = parseInt(value)
                } break
                case 'REG_BINARY':{
                    values[name] = value
                }
            }
            values[name] = value
        }
    } catch (e) {}
    return values
}

// -----------------------------------------------------------------------------

const VC_QUERY = regquery(
    'HKLM/Software/WOW6432Node/Microsoft/VisualStudio/SxS/VC7'
)

function isNumeric(k) {
    return !isNaN(parseFloat(k))
}

function compareNumeric(a,b) {
    a = isString(a) ? parseFloat(a) : a
    b = isString(b) ? parseFloat(b) : b
    return a - b
}

const VC_VERSIONS = Object.keys(VC_QUERY).filter(isNumeric).sort(compareNumeric)
const VC_VERSION = VC_VERSIONS.last
const VC_DIR = VC_QUERY[VC_VERSION]

// -----------------------------------------------------------------------------

const VCVARS_ARCHNAMES = Object.freeze({
       arm:'arm',
       x86:'x86',
    x86_64:'amd64',
})

const WINSDK_ARCHNAMES = Object.freeze({
       arm:'arm',
       x86:'x86',
    x86_64:'x64',
})

const VCVARS_CACHE = {}

function vcvars(config) {
    const archname = VCVARS_ARCHNAMES[config.architecture]
    let vcvars = VCVARS_CACHE[archname]
    if (vcvars === undefined) {
        function parseEnv(env) {
            const lines = env.split(/[\r\n]+/)
            env = {}
            for (let line of lines) {
                const parts = line.split('=')
                const key = parts.shift()
                const value = parts.join('=')
                env[key] = value
            }
            return env
        }

        const vcvarsall = path.join(VC_DIR,'vcvarsall.bat')
        const vcvarsenv = parseEnv(shell(`"${vcvarsall}" ${archname} && set`))

        const paths   = vcvarsenv.Path.split(';')
        const bin     = paths.filter(s=>s.startsWith(VC_DIR)).first
        const include = vcvarsenv.INCLUDE.split(';').filter(s=>s.length)
        const lib     = vcvarsenv.LIB.split(';').filter(s=>s.length)

        const winSdkVersion = parseInt(vcvarsenv.WindowsSDKVersion||"0")
        if (winSdkVersion == 10) {
            // HACK: vcvarsall.bat omits Windows Kits/8.1/Lib/winv6.3/um/...
            // which contains many important libraries, e.g. Kernel32.lib
            const winSdk10Dir = vcvarsenv.WindowsSdkDir
            const winSdkDir = dirname(winSdk10Dir)
            const archname = WINSDK_ARCHNAMES[config.architecture]
            const winSdk8Dir = join(winSdkDir,'8.1\\Lib\\winv6.3\\um',archname)
            if (!lib.includes(winSdk8Dir)) {
                lib.push(winSdk8Dir)
            }
        }

        VCVARS_CACHE[archname] = vcvars = { bin, include, lib }
    }
    return vcvars
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze(vcvars)
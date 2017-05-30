'use strict';
const child_process = require('child_process')
const path          = require('path')

const isArray = Array.isArray

function isBoolean(value)  {
    return typeof(value) === 'boolean'
}

function isDefined(value) {
    return value !== undefined
}

function isEmpty(value) {
    if (!value) return true
    for (let k in value) return false
    return true
}

function isFunction(value) {
    return typeof(value) === 'function'
}

function isInstanceOf(...type_and_optional_value) {
    if (type_and_optional_value.length === 1) {
        const type = type_and_optional_value[0]
        return (value)=>(value instanceof type)
    }
    if (type_and_optional_value.length === 2) {
        const type  = type_and_optional_value[0]
        const value = type_and_optional_value[1]
        return value instanceof type
    }
}

const isInteger = Number.isInteger

const isNaN = Number.isNaN

function isNull(value) {
    return value === null
}

function isNumber(value) {
    return typeof(value) === 'number'
}

function isObject(value) {
    return !isNull(value) && !isArray(value) && typeof(value) === 'object'
}

function isRegExp(value) {
    return value instanceof RegExp
}

function isString(value) {
    return typeof(value) === 'string'
}

function isUndefined(value) {
    return value === undefined
}

// -----------------------------------------------------------------------------

function mergeArrays(arrays) {
    const merged = []
    for (let array of arrays) {
        assert(isArray(array),`expected array`)
        for (let element of array) {
            merged.push(element)
        }
    }
    return merged
}

function mergeObjects(objects) {
    const merged = {}
    for (let object of objects) {
        assert(isObject(object),`expected object`)
        for (let key in object) {
            assert(merged[key] === undefined,`multiple values for '${key}'`)
            merged[key] = object[key]
        }
    }
    return merged
}

function merge(...values) {
    const firstValue = values.first
    if (isArray(firstValue)) return mergeArrays(values)
    if (isObject(firstValue)) return mergeObjects(values)
    error(`expected arrays or objects`)
}

// -----------------------------------------------------------------------------

function flattenValueIntoArray(array,value) {
    if (isUndefined(value)) {
        return array
    }
    if (isArray(value)) {
        for (let item of value) {
            flattenValueIntoArray(array,item)
        }
        return array
    }
    array.push(value)
    return array
}

function flattenArrayOfValues(values) {
    if (values.length === 0) {
        return values
    }
    if (values.length === 1) {
        const value = values[0]
        if (isArray(value)) {
            return flattenArrayOfValues(value)
        }
    }
    const array = []
    for (let value of values) {
        flattenValueIntoArray(array,value)
    }
    return array
}

function flatten(...values) {
    return flattenArrayOfValues(values)
}

// -----------------------------------------------------------------------------

function Array_forEachAsync(jobs,options) {
    const startEach = options.startEach||((job,cb)=>{job.start(cb)})
    const onComplete = options.onComplete||((err)=>{})
    if (isEmpty(jobs)) {
        onComplete()
    }
    let startedJobCount = 0
    function startEachAsync() {process.nextTick(()=>{
        const job = jobs[startedJobCount]
        if (job) {
            startedJobCount += 1
            try {
                startEach(job,onEachComplete)
            } catch (err) {
                onEachComplete(err)
            }
        }
    })}
    let pendingJobCount = jobs.length
    let failed = false
    function onEachComplete(err) {
        pendingJobCount -= 1
        if (failed) {
            return
        }
        if (err) {
            failed = true
            onComplete(err)
            return
        }
        if (pendingJobCount == 0) {
            onComplete()
            return
        }
        startEachAsync()
    }
    const parallelism = options.parallelism||1
    for (let i = 0; i < parallelism; ++i) {
        startEachAsync()
    }
}

function Object_forEachAsync(jobs,options) {
    const startEach = options.startEach||((job,cb)=>{job.start(cb)})
    const onComplete = options.onComplete||((err)=>{})
    if (isEmpty(jobs)) {
        onComplete()
    }
    const keys = Object.keys(jobs)
    let startedJobCount = 0
    function startEachAsync() {process.nextTick(()=>{
        const key = keys[startedJobCount]
        const job = jobs[key]
        if (job) {
            startedJobCount += 1
            try {
                startEach(job,onEachComplete)
            } catch (err) {
                onEachComplete(err)
            }
        }
    })}
    let pendingJobCount = keys.length
    let failed = false
    function onEachComplete(err) {
        pendingJobCount -= 1
        if (failed) {
            return
        }
        if (err) {
            failed = true
            onComplete(err)
            return
        }
        if (pendingJobCount == 0) {
            onComplete()
            return
        }
        startEachAsync()
    }
    const parallelism = options.parallelism||1
    for (let i = 0; i < parallelism; ++i) {
        startEachAsync()
    }
}

function forEachAsync(jobs,options) {
    if (isArray(jobs)) return Array_forEachAsync(jobs,options)
    if (isObject(jobs)) return Object_forEachAsync(jobs,options)
    throw `expected array or object for 'jobs'`
}

// -----------------------------------------------------------------------------

Object.defineProperty(Array.prototype,'first',{get(){
    const length = this.length
    return (length > 0) ? this[0] : undefined
}})

Object.defineProperty(Array.prototype,'last',{get(){
    const length = this.length
    return (length > 0) ? this[length - 1] : undefined
}})

// -----------------------------------------------------------------------------

function pushd(dir,/*optional*/scope/*function*/,/*optional*/...args) {
    // dir = path.resolve(dir)
    // console.log(`pushd('${dir})\n${stack(1)}`)
    const pwd = process.cwd()
    function popd() {
        // console.log(`popd('${pwd}')\n${stack(1)}`)
        process.chdir(pwd)
    }
    if (isUndefined(scope)) {
        try {
            process.chdir(dir)
            return popd
        } catch (e) {
            console.log('*** e:',e)
            popd()
            throw e
        }
    }
    if (isFunction(scope)) {
        try {
            process.chdir(dir)
            return scope(...args)
        } finally {
            popd()
        }
    }
    throw `excpected function, received: ${scope}`
}

// -----------------------------------------------------------------------------

const ExecOptions = Object.freeze({encoding:'utf8'})

function execSync(command) {
    return child_process.execSync(command,ExecOptions).trim()
}

// shell(command,[env,][callback])
function shell(command,/*optional*/env,/*optional*/callback) {
    if (isFunction(env) && isUndefined(callback)) {
        callback = env
        env = undefined
    }
    if (callback) {
        return child_process.exec(command,{env},(err,stdout,stderr)=>{
            if (isString(stdout)) { stdout = stdout.trim() }
            if (isString(stderr)) { stderr = stderr.trim() }
            if (err) {
                err.stdout = stdout
                err.stderr = stderr
            }
            callback(err,stdout,stderr)
        })
    }
    return execSync(command,{env})
}

// -----------------------------------------------------------------------------

function stack(/*optional*/ignore) {
    const Error_prepareStackTrace = Error.prepareStackTrace
    try {
        Error.prepareStackTrace = (_,stack)=>stack
        const stack = new Error().stack
        stack.shift() // ignore function stack() itself
        if (isNumber(ignore)) {
            while (ignore --> 0) {
                stack.shift()
            }
        }
        return '    '+stack.map(entry=>entry.toString()).join('\n    ')
    } finally {
        Error.prepareStackTrace = Error_prepareStackTrace
    }
}

// -----------------------------------------------------------------------------

const fromJSON = JSON.parse

function toJSON(value,replacer,space) {
    if (isUndefined(space)) {
        if (isString(replacer)||isNumber(replacer)) {
            space = replacer
            replacer = null
        }
    }
    return JSON.stringify(value,replacer,space)
}

// -----------------------------------------------------------------------------

function Set_toJSON() { return Array.from(this.values()) }

Object.defineProperty(Set.prototype,'toJSON',{get(){return Set_toJSON}})

// -----------------------------------------------------------------------------

function Obj_toString() {
    function replacer(key,value) {
        if (isNaN(value)) {
            return "NaN"
        }
        if (value === Number.POSITIVE_INFINITY) {
            return "Infinity"
        }
        if (value === Number.NEGATIVE_INFINITY) {
            return "-Infinity"
        }
        if (isFunction(value) && isUndefined(value.toJSON)) {
            return "<function>"
        }
        return value
    }
    return toJSON(this,replacer,4).replace(/"([^\s\\:]+)":/g,(match,p1)=>p1+':')
}

Object.defineProperty(Array.prototype,'toString',{get(){return Obj_toString}})
Object.defineProperty(Object.prototype,'toString',{get(){return Obj_toString}})

// -----------------------------------------------------------------------------

function print(...values) {
    return console.log(values.map(value=>`${value}`).join(''))
}

// -----------------------------------------------------------------------------

function union(a, b) {
    return unique([...a,...b])
}

function unique(a) {
    return a.filter((value,i)=>i===a.indexOf(value))
}

function intersection(a, b) {
    return unique(a).filter(value=>b.includes(value))
}

function difference(a, b) {
    return unique(a).filter(value=>!b.includes(value))
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze({
    difference,
    flatten,
    fromJSON,
    forEachAsync,
    intersection,
    isArray,
    isBoolean,
    isDefined,
    isEmpty,
    isFunction,
    isInteger,
    isNaN,
    isNull,
    isNumber,
    isObject,
    isRegExp,
    isString,
    isUndefined,
    merge,
    pushd,
    shell,
    stack,
    toJSON,
    union,
    unique,
    print,
})
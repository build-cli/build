'use strict';
const fs        = require('./fs')
const path      = require('./path')
const utilities = require('./utilities')

// -----------------------------------------------------------------------------

const assert    = console.assert
const dirname   = path.dirname
const join      = path.join
const resolve   = path.resolve

const exists    = fs.existsSync
const isdir     = fs.isDirectorySync
const mkdirp    = fs.mkdirpSync
const mtime     = fs.mtimeSync
const readFile  = fs.readFileSync
const writeFile = fs.writeFileSync
const unlink    = fs.unlinkSync

const {
    isEmpty,
    isObject,
    forEachAsync,
    pushd,
    shell,
} = utilities

// -----------------------------------------------------------------------------

function load(path,fallback) {
    let json = undefined
    try { json = readFile(path,'utf8') }
    catch (e) { return fallback }
    return fromJSON(json)
}

function save(path,value) {
    writeFile(path,toJSON(value,4))
}

// -----------------------------------------------------------------------------

function stricmp(a,b) { 
    a = a.toLowerCase()
    b = b.toLowerCase()
    return (a < b) ? -1 : (a > b) ? +1 : 0
}

// -----------------------------------------------------------------------------

class Builder {
    constructor(target,config,options) {
        const batches   = []
        const buildLog  = {}
        const buildDirs = new Set()
        const filename  = join(config.cachedir,'.buildlog')
        const sources   = {}
        const errors    = []
        const diagnostics = []
        const rebuild   = options.rebuild
        const verbose   = options.verbose

        function acquireBuildEntry(path) {
            return (buildLog[path]||(buildLog[path]={
                timestamp:undefined,
                command:undefined,
                outputs:undefined
            }))
        }

        function addSource(source,output) {
            if (sources[source] === undefined) {
                sources[source] = mtime(source)
            }
            addOutput(source,output)
        }

        function addOutput(source,output,command) {
            const entry = acquireBuildEntry(source)
            if (output) {
                const outputs = (entry.outputs||(entry.outputs=[]))
                if (!outputs.includes(output)) {
                    outputs.push(output)
                }
            }
            entry.command = command
        }

        let taskCount = 0

        function createTask(name,output,production) {
            taskCount += 1
            name||(name = command)
            const command      = production.command
            const dependencies = production.dependencies
            const digest       = production.digest
            return {name,output,command,dependencies,digest}
        }

        function parseProductions(output,productions,depth=0) {
            if (isEmpty(productions)) {
                return
            }
            for (let path in productions) {
                const production = productions[path]
                if (production) {
                    // const batch = batches[depth]||(batches[depth]=[])
                    const batch = batches[depth]||(batches[depth]={})
                    parseProductions(path,production.sources,depth+1)
                    const {name,command} = production
                    if (batch[command] === undefined) {
                        batch[command] = createTask(name,path,production)
                    }
                    const buildDir = dirname(path)
                    if (!isdir(buildDir)) {
                        buildDirs.add(dirname(path))
                    }
                    addOutput(path,output,command)
                } else {
                    addSource(path,output)
                }
            }
        }

        pushd(target.dirname,()=>{
            const product = target.products[config.product]
            const productions = isObject(product) ? product : product(config)
            parseProductions(undefined,productions)
            batches.reverse()
        })

        function sortBuildLog() {
            const sourcePaths = Object.keys(sources).sort(stricmp)
            for (let sourcePath of sourcePaths) {
                const source = buildLog[sourcePath]
                source.timestamp = sources[sourcePath]
                delete buildLog[sourcePath]
                buildLog[sourcePath] = source
            }
            const builtPaths = Object.keys(buildLog).sort(stricmp)
            for (let builtPath of builtPaths) {
                if (sources[builtPath]) continue
                const output = buildLog[builtPath]
                delete buildLog[builtPath]
                buildLog[builtPath] = output
            }
        }

        function writeBuildLog() {
            try {
                sortBuildLog()
                save(filename,buildLog)
            } catch (err) {
                errors.push(err)
            }
        }

        function createDirectories(onCreateDirectory) {
            try {
                for (let directory of buildDirs) {
                    if (!mkdirp(directory)) continue
                    onCreateDirectory(directory)
                }
            } catch (err) {
                errors.push(err)
            }
        }

        function getRedundantCommands() {
            if (rebuild) {
                // user wants to rebuild everything
                return
            }
            const oldBuildLog = load(filename)
            if (oldBuildLog === undefined) {
                // no '.buildlog' file, must build everything
                return
            }
            Object.freeze(oldBuildLog)
            const redundantCommands = new Set(
                Object.values(oldBuildLog)
                .map(entry=>entry.command)
                .filter(command=>command !== undefined)
            )
            function invalidateRedundantCommands(source) {
                const entry = oldBuildLog[source]
                const command = entry.command
                if (command) {
                    redundantCommands.delete(command)
                }
                const outputs = entry.outputs
                if (outputs) {
                    for (let output of outputs) {
                        if (exists(output)) {
                            unlink(output)
                        }
                        invalidateRedundantCommands(output)
                    }
                }
            }
            for (let path in oldBuildLog) {
                const newTimestamp = mtime(path)
                if (newTimestamp === undefined) {
                    // missing source/output
                    invalidateRedundantCommands(path)
                    continue
                }
                const oldEntry = oldBuildLog[path]
                const oldTimestamp = oldEntry.timestamp
                if (oldTimestamp === undefined) {
                    // not a source/dependenccy
                    continue
                }
                if (newTimestamp !== oldTimestamp) {
                    // modified source/dependency
                    invalidateRedundantCommands(path)
                    continue
                }
                if (sources[path] === undefined) {
                    // reuse dependency information
                    sources[path] = oldTimestamp
                    buildLog[path] = oldEntry
                    continue
                }
            }
            return redundantCommands.values()
        }

        function discardRedundantTasks() {
            const redundantCommands = getRedundantCommands()
            if (redundantCommands === undefined) {
                return
            }
            for (let command of redundantCommands) {
                for (let batch of batches) {
                    const task = batch[command]
                    if (task !== undefined) {
                        delete batch[command]
                        taskCount -= 1
                    }
                }
            }
        }

        function recheckSourceTimestamps() {
            for (let source in sources) {
                const oldTimestamp = sources[source]
                const newTimestamp = mtime(source)
                if (newTimestamp != oldTimestamp) {
                    error(`source changed during build: ${source}`)
                }
            }
        }

        function startTask(task,onComplete) {
            assert(isEmpty(errors))
            const command = task.command
            shell(command,(err,stdout,stderr)=>{
                const status = err ? err : { code:0, signal:null }
                const digest = task.digest(status,stdout,stderr)
                for (let dependenccy of digest.dependencies) {
                    addSource(dependenccy,task.output)
                }
                for (let diagnostic of digest.diagnostics) {
                    if (!isObject(diagnostic)) {
                        diagnostic = {
                            status:error,
                            message:toString(diagnostic),
                        }
                    }
                    diagnostic.command = command
                    diagnostics.push(diagnostic)
                    if (diagnostic.status === undefined) {
                        diagnostic.status = 'error'
                    }
                    if (diagnostic.status === 'error') {
                        errors.push(diagnostic)
                    }
                }
                if (err) {
                    return onComplete(err)
                }
                return onComplete(err)
            })
        }

        function startBuild(onBuildProgress,onBuildComplete,parallelism) {
            if (!onBuildProgress) onBuildProgress=()=>{}
            if (!onBuildComplete) onBuildComplete=()=>{}
            const popd = pushd(target.dirname)
            function finishBuild(err) {
                recheckSourceTimestamps()
                writeBuildLog()
                onBuildComplete(errors.length ? errors : undefined)
                popd()
            }
            discardRedundantTasks()
            const steps = taskCount + (verbose ? buildDirs.size : 0)
            let stepsCompleted = 0
            createDirectories((directory)=>{
                if (verbose) {
                    const info = `create ${directory}`
                    const step = ++stepsCompleted
                    onBuildProgress(info,step,steps)
                }
            })
            forEachAsync(batches,{
                startEach(batch,onBatchComplete){
                    if (errors.length) {
                        return onBatchComplete(errors)
                    }
                    forEachAsync(batch,{
                        startEach(task,onTaskComplete){
                            if (errors.length) {
                                return onTaskComplete(errors)
                            }
                            const name = task.name
                            const step = ++stepsCompleted
                            onBuildProgress(name,step,steps)
                            startTask(task,(err)=>{
                                if (verbose) {
                                    const info = `DONE: ${name}`
                                    onBuildProgress(info,step,steps)
                                }
                                onTaskComplete(err)
                            })
                        },
                        onComplete:onBatchComplete,
                        parallelism,
                    })
                },
                onComplete:finishBuild,
            })
        }

        this.name        = config.name
        this.batches     = batches
        this.buildLog    = buildLog
        this.config      = config
        this.diagnostics = diagnostics
        this.errors      = errors
        this.sources     = sources
        this.target      = target
        this.start       = startBuild
        Object.freeze(this)
    }

    get watchPaths() {
        const sources = this.sources
        const sourcePaths = Object.keys(sources)
        const watchPaths = sourcePaths.map(sourcePath=>{
            return dirname(resolve(sourcePath))
        })
        watchPaths.push(this.target.filename)
        return watchPaths
    }
}

// -----------------------------------------------------------------------------

module.exports = Object.freeze(Builder)
#!/usr/bin/env node --harmony_trailing_commas
'use strict';
require('use-strict')
const fs       = require('./fs')
const os       = require('os')
const path     = require('./path')
const version  = '0.0.2'
const realpath = fs.realpathSync
const relative = path.relative
const startdir = process.cwd()

// -----------------------------------------------------------------------------

Object.defineProperties(global,{
    assert:{get(){return require('assert')},enumerable:true},
    error:{get(){return console.error},enumerable:true},
    exit:{get(){return process.exit},enumerable:true},
    log:{get(){return console.log},enumerable:true},
    version:{get(){return version},enumerable:true},
    warn:{get(){return console.warn},enumerable:true},
})

// -----------------------------------------------------------------------------

// http://tj.github.io/commander.js/
const commander = require('commander')

commander
.version(version)
.usage('[options] <configuration...>')
.option('-B, --rebuild',               'build even when output already exists')
.option('-C, --directory <directory>', 'change to <directory> before building')
.option('-f, --file <file>',           'read <file> as buildfile')
.option('-j, --jobs <number>',         'set the number of parallel jobs')
.option('-v, --verbose',               'show all build commands')
.option('-w, --watch',                 'rebuild whenever files change')
.parse(process.argv)

const configNames = commander.args
const directory   = realpath(commander.directory||startdir)
const file        = commander.file||'buildfile'
const parallelism = commander.jobs||(os.cpus().length * 2)
const rebuild     = commander.rebuild
const verbose     = commander.verbose
const watch       = commander.watch

// -----------------------------------------------------------------------------

const exists = fs.existsSync

if (directory) {
    // change to specified directory
    try {
        process.chdir(directory)
    } catch (e) {
        error(`directory not found, '${directory}'`)
        exit(1)
    }
} else {
    // search up directory tree for buildfile
    while (!exists(file)) {
        const current = process.cwd()
        const parent = path.dirname(current)
        if (parent == current) break;
        process.chdir(parent)
    }
}

if (!exists(file)) {
    console.error(`${file} not found`)
    exit(1)
}

const buildfile = path.resolve(file)
const builddir  = path.join(path.dirname(buildfile),'build')
const cachedir  = path.join(path.dirname(buildfile),'build','.cache')

// -----------------------------------------------------------------------------

const utilities = require('./utilities')
const {
    isDefined,
    shell,
    print,
} = utilities

Object.defineProperties(global,
    Object.keys(utilities).reduce((properties,key,index)=>{
        properties[key] = {get(){return utilities[key]},enumerable:true}
        return properties
    },{})
)

// -----------------------------------------------------------------------------

const BuildConfig  = require('./buildconfig')
const Builder      = require('./builder')
const BuildTargets = require('./buildtargets')

const architectures = require('./architectures')
const architecture  = architectures.host
const includes      = require('./includes')
const platforms     = require('./platforms')
const platform      = platforms.host
const sources       = require('./sources')
const targets       = new BuildTargets()

Object.defineProperties(global,{
    architectures:{get(){return architectures},enumerable:true},
    architecture:{get(){return architecture},enumerable:true},
    BuildConfig:{get(){return BuildConfig},enumerable:true},
    builddir:{get(){return builddir},enumerable:true},
    buildfile:{get(){return buildfile},enumerable:true},
    cachedir:{get(){return cachedir},enumerable:true},
    platforms:{get(){return platforms},enumerable:true},
    platform:{get(){return platform},enumerable:true},
    includes:{get(){return includes},enumerable:true},
    sources:{get(){return sources},enumerable:true},
    targets:{get(){return targets},enumerable:true},
    verbose:{get(){return verbose},enumerable:true},
})

// -----------------------------------------------------------------------------

require(buildfile)

// -----------------------------------------------------------------------------

function showConfigurationsAndExit(status = 1) {
    if (!isEmpty(targets)) {
        log('  Configurations:\n')
        for (let target of targets) {
            const aliases = target.aliases
            const configs = target.configs
            for (let configName in configs) {
                const aliasedName = aliases[configName]
                if (aliasedName) {
                    log(`    ${configName}  \u2192  ${aliasedName}`)
                } else {
                    log(`    ${configName}`)
                }
            }
            log('')
        }
    }
    exit(status)
}

function showUsageAndExit(status = 1) {
    commander.outputHelp()
    showConfigurationsAndExit(status)
}

// -----------------------------------------------------------------------------

const dirname  = path.dirname
const mkdirp   = fs.mkdirpSync

// -----------------------------------------------------------------------------

function makeCacheDirectories(tree) {
    const directories = new Set()
    function addDirectories(tree) {
        if (tree === undefined) {
            return
        }
        for (let output in tree) {
            const directory = dirname(output)
            switch (directory) {
                case '.': break;
                case '..': break;
                default: directories.add(directory)
            }
            const build = tree[output]
            const sources = build && build.sources
            if (sources) addDirectories(sources)
        }
    }
    addDirectories(tree)
    for (let directory of directories) {
        mkdirp(directory)
    }
}

// -----------------------------------------------------------------------------

if (configNames.length === 0) {
    showUsageAndExit()
}

// -----------------------------------------------------------------------------

const watchers = []

function startWatching(watchPaths) {
    const recurse = {recursive:true}
    for (let watchPath of watchPaths) {
        watchers.push(fs.watch(watchPath,recurse,onSourceChanged))
    }
}

function stopWatching() {
    while (watchers.length > 0) {
        watchers.pop().close()
    }
}

function onSourceChanged(event,filename) {
    // print(event,' ',filename)
    stopWatching()
    setTimeout(startBuild,250)
}

// -----------------------------------------------------------------------------

const buildOptions = { rebuild, verbose }

function startBuild() {
    const watchPaths = new Set()

    function finishBuild(err) {
        print('DONE')
        if (watch) {
            startWatching(watchPaths)
            return
        }
        exit(err ? 1 : 0)
    }

    function createBuilder(configName) {
        const targetName = configName.split('.',1)[0]
        const target = targets[targetName]
        assert(isDefined(target),`unrecognized target, '${targetName}'`)
        const config = target.configs[configName]
        assert(isDefined(config),`unrecognized config, '${configName}'`)
        const builder = new Builder(target,config,buildOptions)
        // print('builder: ',builder,'\n')
        return builder
    }
    const builders = configNames.map(createBuilder)

    if (watch) {
        process.stdout.write('\x1Bc');
    }

    forEachAsync(builders,{
        startEach(builder,onEachComplete) {
            print(`${builder.name}`)
            try {
                builder.start(onBuildProgress,(errors)=>{
                    onBuildComplete(errors,builder)
                    onEachComplete(errors)
                },parallelism)
            } catch (err) {
                onBuildComplete([err],builder)
                throw err
            }
        },
        onComplete:finishBuild
    })

    function onBuildProgress(description,step,stepCount) {
        step      = step.toString()
        stepCount = stepCount.toString()
        const stepWidth      = step.length
        const stepCountWidth = stepCount.length
        const stepPadding    = ' '.repeat(stepCountWidth-stepWidth)
        step = `${stepPadding}${step}`
        print(`(${step}/${stepCount}) ${description}`)
    }

    const rootdir = (startdir.length < directory.length) ? startdir : directory
    const chalk   = require('chalk')
    const red     = chalk.bold.red
    const yellow  = chalk.bold.yellow

    function printDiagnostic(diagnostic) {
        const { file,line,column,status,message } = diagnostic
        const parts = []
        if (file) {
            parts.push(`${relative(rootdir,file)}:`)
            if (line) {
                parts.push(`${line}:`)
                if (column) {
                    parts.push(`${column}:`)
                }
            }
            parts.push(' ')
        }
        parts.push(`${status}: ${message}`)
        const text = parts.join('')
        switch (status) {
            case 'error':   print(red(text));    return
            case 'warning': print(yellow(text)); return
            default:        print(text);         return
        }
    }

    function onBuildComplete(errors,builder) {
        builder.watchPaths.map(s=>watchPaths.add(s))
        const diagnostics = builder.diagnostics
        if (diagnostics.length) {
            print('')
            for (let diagnostic of builder.diagnostics) {
                printDiagnostic(diagnostic)
            }
        }
        if (errors) {
            if (!watch) {
                exit(1)
            }
        }
        print('')
    }
}

startBuild()

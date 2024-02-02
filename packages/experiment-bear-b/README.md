# JBR Experiment - LDBC SNB Decentralized

[![Build status](https://github.com/rubensworks/jbr.js/workflows/CI/badge.svg)](https://github.com/rubensworks/jbr.js/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/rubensworks/jbr.js/badge.svg?branch=master)](https://coveralls.io/github/rubensworks/jbr.js?branch=master)
[![npm version](https://badge.fury.io/js/%40jbr-experiment%2Fwatdiv.svg)](https://www.npmjs.com/package/@jbr-experiment/watdiv)

## Requirements

* [Node.js](https://nodejs.org/en/) _(1.12 or higher)_
* [Docker](https://www.docker.com/) _(required for invoking [WatDiv Docker](https://github.com/comunica/watdiv-docker))_
* [jbr](https://github.com/rubensworks/jbr.js/tree/master/packages/jbr) _(required for initializing, preparing, and running experiments on the command line)_

## Quick start

### 1. Install jbr

[jbr](https://github.com/rubensworks/jbr.js/tree/master/packages/jbr) is a command line tool that enables experiments to be initialized, prepared, and started.
It can be installed from the npm registry:

```bash
$ npm install -g jbr
```
or
```bash
$ yarn global add jbr
```

### 2. Initialize a new experiment

Using the `jbr` CLI tool, initialize a new experiment:

```bash
$ jbr init bear-b my-experiment
$ cd my-experiment
```

This will create a new `my-experiment` directory with default configs for this experiment type.

### 3. Configure the required hooks

This experiment type requires you to configure a LDES client and a LDES server.
A value for this hook can be set as follows, such as [`sparql-endpoint-comunica`](https://github.com/rubensworks/jbr.js/tree/master/packages/hook-ldes-client-vsds):

```bash
$ jbr set-hook hookLdesClient ldes-client-vsds
$ jbr set-hook hookLdesServer ldes-server-vsds
```

### 4. Prepare the experiment

In order to run all preprocessing steps, such as creating all required datasets, invoke the prepare step:

```bash
$ jbr prepare
```

### 5. Run the experiment

Once the experiment has been fully configured and prepared, you can run it:

```bash
$ jbr run
```

Once the run step completes, results will be present in the `output/` directory.

## Output

The following output is generated after an experiment has run.

`output/client-times.csv`:
```csv
name;id;results;time;error;endpoint
run-0;0;1;2916.416131;false;https://mumo.ilabt.imec.be/ldes/default
run-1;1;1;2778.228588;false;https://mumo.ilabt.imec.be/ldes/default
run-2;2;1;2826.443585;false;https://mumo.ilabt.imec.be/ldes/default
```

## Configuration

The default generated configuration file (`jbr-experiment.json`) for this experiment looks as follows:

```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/jbr/^2.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@jbr-experiment/watdiv/^1.0.0/components/context.jsonld"
  ],
  "@id": "urn:jrb:test-watdiv2",
  "@type": "ExperimentWatDiv",
  "endpointUrl": "http://localhost:3001/sparql",
  "queryRunnerReplication": 3,
  "queryRunnerWarmupRounds": 1,
  "queryRunnerRecordTimestamps": true,
  "hookLdesServer": {
    "@id": "urn:jrb:test-watdiv2:hookSparqlEndpoint",
    "@type": "HookNonConfigured"
  },
  "hookLdesClient": {
    "@id": "urn:jrb:test-watdiv2:hookSparqlEndpoint",
    "@type": "HookNonConfigured"
  }
}
```

Any config changes require re-running the prepare step.

More background information on these config options can be found in the README of [WatDiv Docker](https://github.com/comunica/watdiv-docker).

### Configuration fields

* `endpointUrl`: URL through which the LDES server endpoint of the `hookLdesServer` hook will be exposed.
* `queryRunnerReplication`: Number of replication runs for [`sparql-benchmark-runner`](https://github.com/comunica/sparql-benchmark-runner.js).
* `queryRunnerWarmupRounds`: Number of warmup runs for [`sparql-benchmark-runner`](https://github.com/comunica/sparql-benchmark-runner.js).
* `queryRunnerRecordTimestamps`: Flag to indicate if result arrival timestamps must be recorded by [`sparql-benchmark-runner`](https://github.com/comunica/sparql-benchmark-runner.js).
* `queryRunnerRecordHttpRequests`: Flag to indicate if the number of http requests must be reported by [`sparql-benchmark-runner`](https://github.com/comunica/sparql-benchmark-runner.js).

## License

jbr.js is written by [Ruben Taelman](http://www.rubensworks.net/).

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).

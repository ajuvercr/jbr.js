import * as Path from "path";
import * as fs from "fs-extra";
import { secureProcessHandler } from "jbr";
import type { Experiment, Hook, ICleanTargets, ITaskContext } from "jbr";
import {
  IBenchmarkResults,
  writeBenchmarkResults,
} from "sparql-benchmark-runner";

/**
 * An experiment instance for the LDBC SNB Decentralized benchmark.
 */
export class ExperimentBearB implements Experiment {
  public readonly hookLdesClient: Hook;
  public readonly hookLdesServer: Hook;
  public readonly endpointUrl: string;
  public readonly queryRunnerReplication: number;
  public readonly queryRunnerWarmupRounds: number;
  public readonly queryRunnerRecordTimestamps: boolean;
  public readonly queryRunnerRecordHttpRequests: boolean;

  /** */
  public constructor(
    hookLdesClient: Hook,
    hookLdesServer: Hook,
    endpointUrl: string,
    queryRunnerReplication: number,
    queryRunnerWarmupRounds: number,
    queryRunnerRecordTimestamps: boolean,
    queryRunnerRecordHttpRequests: boolean,
  ) {
    this.hookLdesServer = hookLdesServer;
    this.hookLdesClient = hookLdesClient;
    this.endpointUrl = endpointUrl;
    this.queryRunnerReplication = queryRunnerReplication;
    this.queryRunnerWarmupRounds = queryRunnerWarmupRounds;
    this.queryRunnerRecordTimestamps = queryRunnerRecordTimestamps;
    this.queryRunnerRecordHttpRequests = queryRunnerRecordHttpRequests;
  }

  public async prepare(
    context: ITaskContext,
    forceOverwriteGenerated: boolean,
  ): Promise<void> {
    // Prepare hook
    await this.hookLdesClient.prepare(context, forceOverwriteGenerated);
    await this.hookLdesServer.prepare(context, forceOverwriteGenerated);

    // Ensure logs directory exists
    await fs.ensureDir(Path.join(context.experimentPaths.output, "logs"));

    // Prepare dataset
    context.logger.info(`Generating WatDiv dataset and queries`);
    // if (
    //   !forceOverwriteGenerated &&
    //   (await fs.pathExists(
    //     Path.join(context.experimentPaths.generated, "dataset.nt"),
    //   ))
    // ) {
    //   context.logger.info(`  Skipped`);
    // } else {
    //   await context.docker.imagePuller.pull({
    //     repoTag: ExperimentWatDiv.DOCKER_IMAGE_WATDIV,
    //   });
    //   await (
    //     await context.docker.containerCreator.start({
    //       imageName: ExperimentWatDiv.DOCKER_IMAGE_WATDIV,
    //       cmdArgs: [
    //         "-s",
    //         String(this.datasetScale),
    //         "-q",
    //         String(this.queryCount),
    //         "-r",
    //         String(this.queryRecurrence),
    //       ],
    //       hostConfig: {
    //         Binds: [`${context.experimentPaths.generated}:/output`],
    //       },
    //       logFilePath: Path.join(
    //         context.experimentPaths.output,
    //         "logs",
    //         "watdiv-generation.txt",
    //       ),
    //     })
    //   ).join();
    // }
  }

  public async run(context: ITaskContext): Promise<void> {
    // Setup SPARQL endpoint
    const endpointProcessHandler = await this.hookLdesServer.start(context);
    const closeProcess = secureProcessHandler(endpointProcessHandler, context);

    // Warmup
    for (let i = 0; i < this.queryRunnerWarmupRounds; i++) {
      const endpointProcessHandler = await this.hookLdesClient.start(context);
      await endpointProcessHandler.join();
    }

    const results: IBenchmarkResults = {};
    // Run LDES Client some times
    //
    for (let i = 0; i < this.queryRunnerReplication; i++) {
      const hrstart = process.hrtime();
      console.log("Container is starting");
      const endpointProcessHandler = await this.hookLdesClient.start(context);
      console.log("Container is started");
      await endpointProcessHandler.join();

      const time = this.countTime(hrstart);
      results["run-" + i] = {
        time: time,
        id: i + "",
        name: "run-" + i,
        count: 1,
        error: false,
        timestamps: [time],
        metadata: { endpoint: this.endpointUrl },
      };
    }
    // Write results
    const resultsOutput = context.experimentPaths.output;
    if (!(await fs.pathExists(resultsOutput))) {
      await fs.mkdir(resultsOutput);
    }

    console.log(results);
    context.logger.info(`Writing results to ${resultsOutput}\n`);
    await writeBenchmarkResults(
      results,
      Path.join(resultsOutput, "client-times.csv"),
      false,
      ["endpoint"],
    );

    // Close process safely
    await closeProcess();
  }

  /**
   * Based on a hrtime start, obtain the duration.
   * @param hrstart process.hrtime
   */
  private countTime(hrstart: [number, number]): number {
    const hrend = process.hrtime(hrstart);
    return hrend[0] * 1_000 + hrend[1] / 1_000_000;
  }

  public async clean(
    context: ITaskContext,
    cleanTargets: ICleanTargets,
  ): Promise<void> {
    await this.hookLdesClient.clean(context, cleanTargets);
    await this.hookLdesServer.clean(context, cleanTargets);
  }
}

import type { IExperimentPaths } from "jbr";
import { ExperimentHandler } from "jbr";
import { ExperimentBearB } from "./ExperimentBearB";

/**
 * An experiment handler for the LDBC SNB Decentralized benchmark.
 */
export class ExperimentHandlerWatDiv extends ExperimentHandler<ExperimentBearB> {
  public constructor() {
    super("bear-b", ExperimentBearB.name);
  }

  public getDefaultParams(
    experimentPaths: IExperimentPaths,
  ): Record<string, any> {
    return {
      endpointUrl: "https://mumo.ilabt.imec.be/ldes/default",
      queryRunnerReplication: 3,
      queryRunnerWarmupRounds: 1,
      queryRunnerRecordTimestamps: true,
      queryRunnerRecordHttpRequests: true,
    };
  }

  public getHookNames(): string[] {
    return ["hookLdesClient"];
  }

  public async init(
    experimentPaths: IExperimentPaths,
    experiment: ExperimentBearB,
  ): Promise<void> {
    // Do nothing
  }
}

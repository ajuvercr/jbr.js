import Path from "path";
import type {
  DockerResourceConstraints,
  Hook,
  ICleanTargets,
  IHookStartOptions,
  ITaskContext,
  ProcessHandler,
} from "jbr";

/**
 * A hook instance for a Comunica-based SPARQL endpoint.
 */
export class HookLdesClientVSDS implements Hook {
  public readonly dockerfileClient: string;
  public readonly resourceConstraints: DockerResourceConstraints;
  public readonly clientLogLevel: string;
  public readonly type: string;
  public readonly endpoint: string;

  public constructor(
    dockerfileClient: string,
    resourceConstraints: DockerResourceConstraints,
    clientLogLevel: string,
    type: string,
    endpoint: string,
  ) {
    this.type = type;
    this.dockerfileClient = dockerfileClient;
    this.resourceConstraints = resourceConstraints;
    this.clientLogLevel = clientLogLevel;
    this.endpoint = endpoint;
  }

  public getDockerImageName(context: ITaskContext): string {
    return "ldes-client";
    // return context.docker.imageBuilder.getImageName(context, `ldes-client`);
  }

  public async prepare(
    context: ITaskContext,
    forceOverwriteGenerated: boolean,
  ): Promise<void> {
    /// We pull from docker
    console.log("Pulling ldes-client from docker repository");
    await context.docker.imagePuller.pull({
      repoTag: "seacoal/ldes-client",
    });
    /// We could also build from Dockerfile
    // await context.docker.imageBuilder.build({
    //   cwd: context.experimentPaths.root,
    //   dockerFile: this.dockerfileClient,
    //   auxiliaryFiles: [this.configClient],
    //   imageName: this.getDockerImageName(context),
    //   buildArgs: {
    //     CONFIG_CLIENT: this.configClient,
    //     QUERY_TIMEOUT: `${this.queryTimeout}`,
    //     MAX_MEMORY: `${this.maxMemory}`,
    //     LOG_LEVEL: this.clientLogLevel,
    //   },
    //   logger: context.logger,
    // });
  }

  public async start(
    context: ITaskContext,
    options?: IHookStartOptions,
  ): Promise<ProcessHandler> {
    console.log("Starting ldes client on url", this.endpoint);
    return await context.docker.containerCreator.start({
      containerName: "ldes-client-" + this.type,
      imageName: "seacoal/ldes-client",
      resourceConstraints: this.resourceConstraints,
      cmdArgs: [this.endpoint],
      logFilePath: Path.join(
        context.experimentPaths.output,
        "logs",
        "ldes-client-log.txt",
      ),
      statsFilePath: Path.join(
        context.experimentPaths.output,
        "stats-ldes-client.csv",
      ),
    });
  }

  public async clean(
    context: ITaskContext,
    cleanTargets: ICleanTargets,
  ): Promise<void> {
    if (cleanTargets.docker) {
      await context.docker.containerCreator.remove("ldes-client-" + this.type);
    }
  }
}

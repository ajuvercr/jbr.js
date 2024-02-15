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
  public readonly ldesEndpoint: string;
  public readonly dockerfileClient: string;
  public readonly resourceConstraints: DockerResourceConstraints;
  public readonly clientLogLevel: string;
  public readonly networkName?: string;
  public readonly quiet?: boolean;

  public constructor(
    ldesEndpoint: string,
    dockerfileClient: string,
    resourceConstraints: DockerResourceConstraints,
    clientLogLevel: string,
    networkName?: string,
    quiet?: boolean,
  ) {
    this.dockerfileClient = dockerfileClient;
    this.resourceConstraints = resourceConstraints;
    this.clientLogLevel = clientLogLevel;
    this.ldesEndpoint = ldesEndpoint;
    this.networkName = networkName;
    this.quiet = quiet;
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
  }

  public async start(
    context: ITaskContext,
    options?: IHookStartOptions,
  ): Promise<ProcessHandler> {
    console.log("Starting ldes client on url", this.ldesEndpoint);

    const networkName = this.networkName
      ? await context.docker.networkCreator.find(this.networkName)
      : undefined;

    console.log("Attaching to network", this.networkName, networkName);

    const container = await context.docker.containerCreator.start({
      containerName: "ldes-client",
      imageName: "seacoal/ldes-client",
      resourceConstraints: this.resourceConstraints,
      cmdArgs: [this.ldesEndpoint],
      logFilePath: Path.join(
        context.experimentPaths.output,
        "logs",
        "ldes-client-log.txt",
      ),
      hostConfig: {
        NetworkMode: networkName?.network.id,
      },
      statsFilePath: Path.join(
        context.experimentPaths.output,
        "stats-ldes-client.csv",
      ),
    });

    if (!this.quiet) {
      container.outputStream.pipe(process.stdout);
    }

    return container;
  }

  public async clean(
    context: ITaskContext,
    cleanTargets: ICleanTargets,
  ): Promise<void> {
    if (cleanTargets.docker) {
      await context.docker.containerCreator.remove("ldes-client");
    }
  }
}

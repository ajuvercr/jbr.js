import Path from "path";
import type {
  DockerResourceConstraints,
  Hook,
  ICleanTargets,
  IHookStartOptions,
  ITaskContext,
  ProcessHandler,
} from "jbr";
import { writeFile } from "fs-extra";

const CONTAINER_NAME = "ldes-client-vsds";
function config(url: string): string {
  return `
server:
  port: 8080

orchestrator:
  pipelines:
    - name: bear-b-pipeline-client
      description: "bear-b dataset client for configured VSDS server"
      input:
        name: be.vlaanderen.informatievlaanderen.ldes.ldi.client.LdioLdesClient
        config:
          url: ${url}
          source-format: "text/turtle"
      outputs:
            - name: be.vlaanderen.informatievlaanderen.ldes.ldio.LdioConsoleOut
              config:
                content-type: text/turtle

spring:
  codec:
    max-in-memory-size: 10MB

logging:
  level:
    root: WARN
    be.vlaanderen.informatievlaanderen.ldes.ldio.Application: INFO
    be.vlaanderen.informatievlaanderen.ldes.ldio: INFO
    be.vlaanderen.informatievlaanderen.ldes.ldio.LdioHttpInPoller: DEBUG
    be.vlaanderen.informatievlaanderen.ldes.ldio.LdioHttpEnricher: DEBUG
`;
}

/**
 * A hook instance for a Comunica-based SPARQL endpoint.
 */
export class HookLdesClientVSDS implements Hook {
  public readonly ldesEndpoint: string;
  public readonly dockerfileClient: string;
  public readonly resourceConstraints?: DockerResourceConstraints;
  public readonly clientLogLevel: string;
  public readonly networkName?: string;
  public readonly quiet?: boolean;

  public constructor(
    ldesEndpoint: string,
    dockerfileClient: string,
    clientLogLevel: string,
    resourceConstraints?: DockerResourceConstraints,
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

  private clientFile(context: ITaskContext): string {
    const out = Path.join(context.experimentPaths.input, "bear-b-client.yml");
    console.log("File", out);
    return out;
  }

  public async prepare(
    context: ITaskContext,
    forceOverwriteGenerated: boolean,
  ): Promise<void> {
    console.log("Writing config file");
    await writeFile(this.clientFile(context), config(this.ldesEndpoint), {
      encoding: "utf-8",
    });

    console.log("Config");
    console.log(config(this.ldesEndpoint));

    /// We pull from docker
    console.log("Pulling ldes-client from docker repository");
    await context.docker.imagePuller.pull({
      repoTag: "ldes/ldi-orchestrator:latest",
    });
  }

  public async start(
    context: ITaskContext,
    options?: IHookStartOptions,
  ): Promise<ProcessHandler> {
    console.log("Starting vsds ldes client on url", this.ldesEndpoint);

    const networkName = this.networkName
      ? await context.docker.networkCreator.find(this.networkName)
      : undefined;

    console.log("Attaching to network", this.networkName);
    console.log({
      hostConfig: {
        NetworkMode: networkName?.network.id,
        Binds: [`${this.clientFile(context)}:/config/application.yml`],
      },
    });

    const container = await context.docker.containerCreator.start({
      containerName: CONTAINER_NAME,
      imageName: "ldes/ldi-orchestrator:latest",
      resourceConstraints: this.resourceConstraints,
      logFilePath: Path.join(
        context.experimentPaths.output,
        "logs",
        "ldes-client-log.txt",
      ),
      hostConfig: {
        NetworkMode: networkName?.network.id,
        Binds: [`${this.clientFile(context)}:/config/application.yml`],
      },
      env: [
        "SPRING_CONFIG_NAME=application",
        "SPRING_CONFIG_LOCATION=/config/",
      ],
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
      await context.docker.containerCreator.remove(CONTAINER_NAME);
    }
  }
}

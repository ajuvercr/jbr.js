import Path from "path";
import type {
  Hook,
  ICleanTargets,
  IExperimentPaths,
  IHookStartOptions,
  ITaskContext,
  ProcessHandler,
} from "jbr";

import * as fs from "fs-extra";

/**
 * A hook instance for a Comunica-based SPARQL endpoint.
 */
export class HookLdesSolidServer implements Hook {
  public readonly dockerfileClient: string;
  public readonly auxiliaryFiles: string[];
  public readonly clientPort: number;

  public constructor(
    dockerfileClient: string,
    // auxiliaryFiles from templates, will be mapped to input
    auxiliaryFiles: string[],
    clientPort: number,
  ) {
    this.dockerfileClient = dockerfileClient;
    this.auxiliaryFiles = auxiliaryFiles;
    this.clientPort = clientPort;
  }

  public getDockerImageName(context: ITaskContext): string {
    return context.docker.imageBuilder.getImageName(
      context,
      `ldes-solid-server`,
    );
  }

  public async prepare(
    context: ITaskContext,
    forceOverwriteGenerated: boolean,
  ): Promise<void> {
    // Build client Dockerfile
    await context.docker.imageBuilder.build({
      cwd: context.experimentPaths.root,
      dockerFile: this.dockerfileClient,
      auxiliaryFiles: this.auxiliaryFiles,
      imageName: this.getDockerImageName(context),
      buildArgs: {
        FILES: this.auxiliaryFiles.join(" "),
      },
      logger: context.logger,
    });
  }

  public async start(
    context: ITaskContext,
    options?: IHookStartOptions,
  ): Promise<ProcessHandler> {
    return await context.docker.containerCreator.start({
      containerName: "ldes-solid-server",
      imageName: this.getDockerImageName(context),
      hostConfig: {
        PortBindings: {
          "8000/tcp": [{ HostPort: `${this.clientPort}` }],
        },
        NetworkMode: options?.docker?.network,
      },
      logFilePath: Path.join(
        context.experimentPaths.output,
        "logs",
        "ldes-solid-server.txt",
      ),
      statsFilePath: Path.join(
        context.experimentPaths.output,
        "stats-ldes-solid-server.csv",
      ),
    });
  }

  public async clean(
    context: ITaskContext,
    cleanTargets: ICleanTargets,
  ): Promise<void> {
    if (cleanTargets.docker) {
      await context.docker.containerCreator.remove("ldes-solid-server");
    }
  }
  public async init(
    experimentPaths: IExperimentPaths,
    hookHandler: HookLdesSolidServer,
  ): Promise<void> {
    // Create Dockerfile for client
    if (
      !(await fs.pathExists(Path.join(experimentPaths.input, "dockerfiles")))
    ) {
      await fs.mkdir(Path.join(experimentPaths.input, "dockerfiles"));
    }

    await fs.copyFile(
      Path.join(__dirname, "templates", "dockerfiles", "Dockerfile-client"),
      Path.join(experimentPaths.input, "dockerfiles", "Dockerfile-client"),
    );

    // Create config for client
    if (!(await fs.pathExists(Path.join(experimentPaths.input)))) {
      await fs.mkdir(Path.join(experimentPaths.input));
    }

    for (let auxFile of hookHandler.auxiliaryFiles) {
      await fs.copyFile(
        Path.join(__dirname, "templates", auxFile),
        Path.join(experimentPaths.input, auxFile),
      );
    }
  }
}

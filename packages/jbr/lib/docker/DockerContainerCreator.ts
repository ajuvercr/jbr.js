import type Dockerode from "dockerode";
import * as fs from "fs-extra";
import { option } from "yargs";
import { DockerContainerHandler } from "./DockerContainerHandler";
import type { DockerResourceConstraints } from "./DockerResourceConstraints";

/**
 * Conveniently create a Docker container.
 */
export class DockerContainerCreator {
  private readonly dockerode: Dockerode;

  public constructor(dockerode: Dockerode) {
    this.dockerode = dockerode;
  }

  /**
   * Start a container.
   * @param options Container options
   */
  public async start(
    options: IDockerContainerCreatorArgs,
  ): Promise<DockerContainerHandler> {
    // Initialize Docker container
    const exposedPorts: { [port: string]: {} } = {};
    for (let port of options.exposedPorts || []) {
      exposedPorts[port] = {};
    }
    const container = await this.dockerode.createContainer({
      name: options.containerName,
      Hostname: options.containerName,
      Image: options.imageName,
      ExposedPorts: exposedPorts,
      Tty: true,
      Cmd: options.cmdArgs,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        ...(options.hostConfig || {}),
        ...options.resourceConstraints?.toHostConfig(),
      },
      Env: options.env || [],
    });

    // Attach output of container
    const out = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });

    // Create container handler
    const containerHandler = new DockerContainerHandler(
      container,
      out,
      options.statsFilePath,
    );

    // Write output to logs
    if (options.logFilePath) {
      // eslint-disable-next-line import/namespace
      out.pipe(fs.createWriteStream(options.logFilePath, "utf8"));
    } else {
      out.resume();
    }

    // Start container
    await container.start();

    return containerHandler;
  }

  /**
   * Remove a container
   * @param name A container name
   */
  public async remove(name: string): Promise<void> {
    const container = this.dockerode.getContainer(name);
    if (container) {
      try {
        await container.remove({ force: true });
      } catch {
        // Ignore errors
      }
    }
  }
}

export interface IDockerContainerCreatorArgs {
  containerName?: string;
  imageName: string;
  cmdArgs?: string[];
  resourceConstraints?: DockerResourceConstraints;
  hostConfig?: Dockerode.HostConfig;
  logFilePath?: string;
  statsFilePath?: string;
  env?: string[];
  exposedPorts?: string[];
}

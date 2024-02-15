import type Dockerode from "dockerode";
import { DockerNetworkHandler } from "./DockerNetworkHandler";

/**
 * Conveniently create a Docker network.
 */
export class DockerNetworkCreator {
  private readonly dockerode: Dockerode;

  public constructor(dockerode: Dockerode) {
    this.dockerode = dockerode;
  }

  /**
   * Create a network
   * @param options Network options
   */
  public async create(
    options: Dockerode.NetworkCreateOptions,
  ): Promise<DockerNetworkHandler> {
    return new DockerNetworkHandler(
      await this.dockerode.createNetwork(options),
    );
  }

  public async find(
    name: string,
    create: boolean = false,
  ): Promise<DockerNetworkHandler | undefined> {
    const networks = await this.dockerode.listNetworks();
    for (let network of networks) {
      if (network.Name == name) {
        return new DockerNetworkHandler(this.dockerode.getNetwork(network.Id));
      }
    }
    if (create) {
      return await this.create({ Name: name });
    }
  }

  /**
   * Remove a network
   * @param name A network name
   */
  public async remove(name: string): Promise<void> {
    // First prune unused networks
    await this.dockerode.pruneNetworks();

    const network = this.dockerode.getNetwork(name);
    if (network) {
      try {
        await network.remove({ force: true });
      } catch {
        // Ignore errors
      }
    }
  }
}

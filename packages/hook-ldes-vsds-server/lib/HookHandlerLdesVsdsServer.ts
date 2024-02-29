import type { IExperimentPaths } from "jbr";
import { HookHandler } from "jbr";
import { HookLdesVsdsServer } from "./HookLdesVsdsServer";

/**
 * Hook handler for a Comunica-based SPARQL endpoint.
 */
export class HookHandlerLdesVsdsServer extends HookHandler<HookLdesVsdsServer> {
  public constructor() {
    super("ldes-vsds-server", HookLdesVsdsServer.name);
  }

  public getDefaultParams(
    experimentPaths: IExperimentPaths,
  ): Record<string, any> {
    return {
      dockerfileClient: "input/dockerfiles/Dockerfile-client",
      resourceConstraints: {
        "@type": "StaticDockerResourceConstraints",
        cpu_percentage: 100,
      },
      config: "input/",
      contextClient: "input/context-client.json",
      additionalBinds: [],
      clientPort: 3_001,
      clientLogLevel: "info",
      queryTimeout: 300,
      maxMemory: 8_192,
    };
  }

  public getSubHookNames(): string[] {
    return [];
  }

  public async init(
    _experimentPaths: IExperimentPaths,
    _hookHandler: HookLdesVsdsServer,
  ): Promise<void> {}
}

import type { IExperimentPaths } from "jbr";
import { HookHandler } from "jbr";
import { HookLdesClientJs } from "./HookLdesClientJs";

/**
 * Hook handler for a Comunica-based SPARQL endpoint.
 */
export class HookHandlerSparqlEndpointComunica extends HookHandler<HookLdesClientJs> {
  public constructor() {
    super("ldes-client-js", HookLdesClientJs.name);
  }

  public getDefaultParams(
    _experimentPaths: IExperimentPaths,
  ): Record<string, any> {
    return {
      ldesEndpoint: "http://ldesserver:3000/ldes/default",
      resourceConstraints: {
        "@type": "StaticDockerResourceConstraints",
        cpu_percentage: 100,
      },
      networkName: "ldesNetwork",
      quiet: true,
    };
  }

  public getSubHookNames(): string[] {
    return [];
  }

  public async init(
    _experimentPaths: IExperimentPaths,
    _hookHandler: HookLdesClientJs,
  ): Promise<void> {}
}

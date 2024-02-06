import Path from "path";
import * as fs from "fs-extra";
import type { IExperimentPaths } from "jbr";
import { HookHandler } from "jbr";
import { HookLdesSolidServer } from "./HookLdesSolidServer";

/**
 * Hook handler for a Comunica-based SPARQL endpoint.
 */
export class HookHandlerLdesSolidServer extends HookHandler<HookLdesSolidServer> {
  public constructor() {
    super("ldes-solid-server", HookLdesSolidServer.name);
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
    experimentPaths: IExperimentPaths,
    hookHandler: HookLdesSolidServer,
  ): Promise<void> {
    console.log("Init hook handler")
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

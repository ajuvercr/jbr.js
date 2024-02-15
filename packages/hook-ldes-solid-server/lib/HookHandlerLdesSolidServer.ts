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
    console.log("HookHandlerLdesSolidServer started");
  }

  public getDefaultParams(
    _experimentPaths: IExperimentPaths,
  ): Record<string, any> {
    return {
      dockerfileClient: "dockerfiles/Dockerfile-client",
      pageSize: 150,
      resourceConstraints: {
        "@type": "StaticDockerResourceConstraints",
        cpu_percentage: 100,
      },
      auxiliaryFiles: [
        "input/package.json",
        "input/pipeline.ttl",
        "input/server.ttl",
        "input/server.js",
        "input/metadataIn.ttl",
      ],
      clientPort: 3_000,
      env: ["DB_URL", "PAGE_SIZE"],
      dataGlob: ["../vsds/bear-b-dataset/day/**/*"],
      ingestPort: 3_001,
      networkName: "ldesNetwork",
      quiet: true,
    };
  }

  public getSubHookNames(): string[] {
    return [];
  }

  public async init(
    experimentPaths: IExperimentPaths,
    hookHandler: HookLdesSolidServer,
  ): Promise<void> {
    console.log("Init hook handler");

    if (!(await fs.pathExists(Path.join(experimentPaths.input)))) {
      await fs.mkdir(Path.join(experimentPaths.input));
    }

    // Create Dockerfile for client
    if (
      !(await fs.pathExists(Path.join(experimentPaths.root, "dockerfiles")))
    ) {
      await fs.mkdir(Path.join(experimentPaths.root, "dockerfiles"));
    }

    await fs.copyFile(
      Path.join(__dirname, "templates", hookHandler.dockerfileClient),
      Path.join(experimentPaths.root, hookHandler.dockerfileClient),
    );

    for (let auxFile of hookHandler.auxiliaryFiles) {
      await fs.copyFile(
        Path.join(__dirname, "templates", auxFile),
        Path.join(experimentPaths.root, auxFile),
      );
    }
  }
}

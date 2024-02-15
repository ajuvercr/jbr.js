import Path from "path";
import {
  Hook,
  ICleanTargets,
  IExperimentPaths,
  IHookStartOptions,
  ITaskContext,
  ProcessHandler,
  ProcessHandlerComposite,
} from "jbr";
import { glob } from "glob";

import { HookHandlerLdesSolidServer } from "./HookHandlerLdesSolidServer";
import { readFile } from "fs/promises";

/**
 * A hook instance for a Comunica-based SPARQL endpoint.
 */
export class HookLdesSolidServer implements Hook {
  public readonly dockerfileClient: string;
  public readonly auxiliaryFiles: string[];
  public readonly clientPort: number;
  public readonly env: string[];
  public readonly pageSize: number;
  public readonly dataGlob: string[];
  public readonly ingestPort: number;
  public readonly networkName?: string;
  public readonly imageName?: string;
  public readonly quiet?: boolean;

  public constructor(
    dockerfileClient: string,
    // auxiliaryFiles from templates, will be mapped to input
    pageSize: number,
    auxiliaryFiles: string[],
    clientPort: number,
    env: string[],
    dataGlob: string[],
    ingestPort: number,
    networkName?: string,
    quiet?: boolean,
  ) {
    this.pageSize = pageSize;
    console.log("HookLdesSolidServer started");
    this.dockerfileClient = dockerfileClient;
    this.auxiliaryFiles = auxiliaryFiles;
    this.clientPort = clientPort;
    this.env = env;
    this.dataGlob = dataGlob;
    this.ingestPort = ingestPort;
    this.networkName = networkName;
    this.quiet = quiet;
  }

  public getDockerImageName(context: ITaskContext, type: string): string {
    return context.docker.imageBuilder.getImageName(
      context,
      `ldes-solid-${type}`,
    );
  }

  public async prepare(
    context: ITaskContext,
    forceOverwriteGenerated: boolean,
  ): Promise<void> {
    await new HookHandlerLdesSolidServer().init(context.experimentPaths, this);
    // Build client Dockerfile
    console.log("Paths", context.experimentPaths);
    const auxFiles = this.auxiliaryFiles.map((x) => x);
    console.log("auxFiles", auxFiles);
    await context.docker.imageBuilder.build({
      cwd: context.experimentPaths.root,
      dockerFile: this.dockerfileClient,
      auxiliaryFiles: auxFiles,
      imageName: this.getDockerImageName(context, "server"),
      buildArgs: {
        FILES: auxFiles.join(" "),
      },
      logger: context.logger,
    });

    console.log("Pulling mongo:7");
    await context.docker.imagePuller.pull({
      repoTag: "mongo:7",
    });
  }

  public async start(
    context: ITaskContext,
    options?: IHookStartOptions,
  ): Promise<ProcessHandler> {
    const envs = this.env.flatMap((x) => {
      if (process.env[x]) {
        return [`${x}=${process.env[x]}`];
      } else {
        return [];
      }
    });
    envs.push(`PAGE_SIZE=${this.pageSize}`);

   

    // Create shared network
    const networkHandler = options?.docker?.network
      ? undefined
      : await context.docker.networkCreator.find(
          this.networkName ||
            this.getDockerImageName(
              context,
              this.getDockerImageName(context, "network"),
            ),
          true,
        );

    console.log("Attaching to network ", this.networkName, networkHandler);

    const network = options?.docker?.network || networkHandler!.network.id;

    console.log("network created", network);
    console.log("Starting mongo container");
    const mongo = await context.docker.containerCreator.start({
      containerName: "mongo",
      imageName: "mongo:7",
      hostConfig: {
        NetworkMode: network,
      },
      logFilePath: Path.join(
        context.experimentPaths.output,
        "logs",
        "ldes-solid-mongo.txt",
      ),
      statsFilePath: Path.join(
        context.experimentPaths.output,
        "stats-ldes-solid-mongo.csv",
      ),
      env: envs,
    });

    console.log("Starting pipeline container");
    const pipeline = await context.docker.containerCreator.start({
      containerName: "ldes-solid-ingest",
      imageName: this.getDockerImageName(context, "server"),
      hostConfig: {
        PortBindings: {
          "8000/tcp": [{ HostPort: `${this.clientPort}` }],
          "3001/tcp": [{ HostPort: `${this.ingestPort}` }],
        },
        NetworkMode: network,
      },
      logFilePath: Path.join(
        context.experimentPaths.output,
        "logs",
        "ldes-solid-ingest.txt",
      ),
      statsFilePath: Path.join(
        context.experimentPaths.output,
        "stats-ldes-solid-server-ingest.csv",
      ),
      cmdArgs: ["pipeline.ttl"],
      env: envs,
    });
    const ingestStats = await pipeline.startCollectingStats();

    await new Promise((res) => setTimeout(res, 3000));
    await this.ingest();

    ingestStats();
    await pipeline.close();

    console.log("Context experiment root", context.experimentPaths.root);
    const server = await context.docker.containerCreator.start({
      containerName: "ldesserver",
      imageName: this.getDockerImageName(context, "server"),
      hostConfig: {
        PortBindings: {
          "3000/tcp": [{ HostPort: `3000` }],
        },
        NetworkMode: network,
        Binds: [
          // `${Path.join(context.experimentPaths.input, "node_modules")}:/tmp/node_modules`,
        ],
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
      cmdArgs: ["server.ttl"],
      env: envs,
    });

    if (!this.quiet) {
      server.outputStream.pipe(process.stdout);
    }

    await new Promise((res) => setTimeout(res, 8000));

    return new ProcessHandlerComposite([server, mongo]);
  }

  private async ingest() {
    const dataFiles = await glob(this.dataGlob, { nodir: true });
    dataFiles.sort();
    let i = 0;

    for (let file of dataFiles) {
      i += 1;
      console.log("ingesting", file, `(${i}/${dataFiles.length})`);
      let content = await readFile(file, { encoding: "utf8" });
      const subjects = new Set<string>();
      let date: string = "";
      let pred: string = "";
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length < 3) continue;
        const [subj, predicate, object] = line.split(" ", 3);
        if (subj !== "<https://aic.ai.wu.ac.at/qadlod/bear.html#BEAR-B>") {
          subjects.add(subj);
        } else {
          date = object;
          pred = predicate;
          lines.splice(i, 1);
          i--;
        }
      }
      lines.push(
        ...[...subjects.keys()].map((subj) => `${subj} ${pred} ${date}`),
      );
      // mjam
      content = lines.join("\n");

      const url = `http://localhost:${this.ingestPort}`;
      console.log("Ingesting  file to", url);
      const resp = await fetch(url, {
        body: content,
        method: "POST",
      });
      if (!resp.ok) {
        console.log("Ingesting file", file, "failed");
        console.log(resp.status, resp.statusText);
      }

      await new Promise((res) => setTimeout(res, 2000));
    }
  }

  public async clean(
    context: ITaskContext,
    cleanTargets: ICleanTargets,
  ): Promise<void> {
    console.log("Cleaning", cleanTargets);
    if (cleanTargets.docker) {
      await context.docker.networkCreator.remove(
        this.networkName || this.getDockerImageName(context, "network"),
      );
      await context.docker.containerCreator.remove("mongo");
      await context.docker.containerCreator.remove("ldes-solid-ingest");
      await context.docker.containerCreator.remove("ldesServer");
    }
  }
}

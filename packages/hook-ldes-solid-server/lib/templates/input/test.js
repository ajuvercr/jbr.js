const CSS = require("@solid/community-server");
const fs = require("fs/promises");

const basicConfig = {
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@solid/community-server/^5.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/ldes-solid-server/^0.0.0/components/context.jsonld",
  ],
  "import": [
    "css:config/app/main/default.json",
    "css:config/app/init/initialize-root.json",
    "css:config/app/setup/disabled.json",
    "css:config/app/variables/default.json",
    "css:config/http/handler/default.json",
    "css:config/http/middleware/websockets.json",
    "css:config/http/server-factory/websockets.json",
    "css:config/http/static/default.json",
    "css:config/identity/access/public.json",
    "css:config/identity/email/default.json",
    "css:config/identity/handler/default.json",
    "css:config/identity/ownership/token.json",
    "css:config/identity/pod/static.json",
    "css:config/identity/registration/enabled.json",
    "css:config/ldp/authentication/dpop-bearer.json",
    "css:config/ldp/authorization/allow-all.json",
    "lss:config/ldp/handler/default.json",
    "css:config/ldp/metadata-parser/default.json",
    "lss:config/ldp/metadata-writer/default.json",
    "css:config/ldp/modes/default.json",
    "css:config/storage/backend/data-accessors/memory.json",
    "css:config/storage/key-value/memory.json",
    "css:config/storage/middleware/default.json",
    "css:config/util/auxiliary/acl.json",
    "css:config/util/identifiers/suffix.json",
    "css:config/util/index/default.json",
    "css:config/util/logging/winston.json",
    "css:config/util/representation-conversion/default.json",
    "css:config/util/resource-locker/memory.json",
    "css:config/util/variables/default.json",
  ],
  "@graph": [
    {
      "comment":
        "A more complex example with 3 different stores being routed to.",
      "@id": "urn:solid-server:default:ResourceStore_Backend",
      "@type": "RoutingResourceStore",
      "rule": {
        "@id": "urn:solid-server:default:RouterRule",
      },
    },
    {
      "@id": "urn:solid-server:default:RouterRule",
      "@type": "RegexRouterRule",
      "base": {
        "@id": "urn:solid-server:default:variable:baseUrl",
      },
      "rules": [
        {
          "@type": "RegexRule",
          "regex": "^/(\\.acl|\\.meta)?$",
          "store": {
            "@id": "urn:solid-server:default:MemoryResourceStore",
          },
        },
        {
          "@type": "RegexRule",
          "regex": { "@id": "urn:solid-server:default:relative-path" },
          "store": {
            "comment":
              "A more complex example with 3 different stores being routed to.",
            "@type": "RepresentationConvertingStore",
            "source": {
              "@type": "LDESStore",
              "id": "http://mine.org/testing",
              "base": { "@id": "urn:solid-server:default:variable:baseUrl" },
              "relativePath": {
                "@id": "urn:solid-server:default:relative-path",
              },
              "views": [
                {
                  "@type": "PrefixView",
                  "prefix": "default",
                  "view": {
                    "@type": "MongoSDSView",
                    "descriptionId":
                      "http://localhost:3000/ldes/#timestampFragmentation",
                    "streamId": "https://w3id.org/sds#Stream",
                    "db": {
                      "@id": "urn:solid-server:default:DBConfig",
                    },
                    "freshDuration": 240,
                  },
                },
              ],
            },
            "options_outConverter": {
              "@id": "urn:solid-server:default:RepresentationConverter",
            },
          },
        },
      ],
    },
    {
      "@id": "urn:solid-server:default:MemoryResourceStore",
      "@type": "DataAccessorBasedStore",
      "identifierStrategy": {
        "@id": "urn:solid-server:default:IdentifierStrategy",
      },
      "auxiliaryStrategy": {
        "@id": "urn:solid-server:default:AuxiliaryStrategy",
      },
      "accessor": {
        "@id": "urn:solid-server:default:MemoryDataAccessor",
      },
      "metadataStrategy": {
        "@id": "urn:solid-server:default:MetadataStrategy",
      },
    },
    {
      "@id": "urn:solid-server:default:relative-path",
      "valueRaw": "/ldes/",
    },
  ],
};

async function start(dbConfig, views) {
  console.log("DB config", dbConfig);
  console.log("views", views);

  const dbJson = {
    "@id": "urn:solid-server:default:DBConfig",
    "@type": "DBConfig",
    metaCollection: dbConfig.metadata,
    indexCollection: dbConfig.index,
    membersCollection: dbConfig.data,
    dbUrl: dbConfig.url,
  };
  basicConfig["@graph"].push(dbJson);

  const viewsJson = views.map((view) => ({
    "@type": "PrefixView",
    prefix: view.prefix,
    view: {
      "@type": "MongoSDSView",
      "descriptionId": view.description,
      "streamId": view.stream,
      "db": {
        "@id": "urn:solid-server:default:DBConfig",
      },
      "freshDuration": 240,
    },
  }));
  basicConfig["@graph"][1].rules[1].store.source.views = viewsJson;

  const path = "/tmp/config.json";
  await fs.writeFile(path, JSON.stringify(basicConfig), { flag: "w" });

  return async () => {
    const runner = new CSS.AppRunner();
    const config = {
      // This makes little sense, but I'll allow it
      mainModulePath: __dirname + "/node_modules/@solid/community-server/",
      logLevel: "info",
      typeChecking: false,
    };
    console.log(config, path);
    await runner.run(config, [path]);
  };
}
exports.test = test;

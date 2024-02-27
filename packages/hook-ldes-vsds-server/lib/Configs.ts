type ConfigElement = {
  config: (config: { [key: string]: string }) => string;
  name: string;
};

export const DockerConfigs = {
  server: {
    tag: "ldes/ldes-server:2.8.0-SNAPSHOT",
    container: "ldesserver",
  },

  orchestrator: {
    tag: "ldes/ldi-orchestrator:1.14.0-SNAPSHOT",
    container: "vsds-orchestrator",
  },

  mongo: {
    tag: "mongo:7",
    container: "ldes-mongodb",
  },
};

export const Configs = {
  server: {
    name: "server.yml",
    config: () => `
mongock:
    migration-scan-package: VSDS
springdoc:
    swagger-ui:
        path: /v1/swagger
ldes-server:
    host-name: "http://ldesserver:8080"
    use-relative-url: true
management:
    tracing:
        enabled: false
spring:
  data:
    mongodb:
        database: bearb
        host: ldes-mongodb
        port: 27017
        auto-index-creation: true
`,
  },
  pipeline: {
    name: "pipeline.yml",
    config: () => `
server:
  port: 8080

orchestrator:
  pipelines:
    - name: bear-b-pipeline-in
      description: "Ingest bear-b dataset into configured VSDS server"
      input:
        name: be.vlaanderen.informatievlaanderen.ldes.ldio.LdioHttpIn
        adapter:
          name: be.vlaanderen.informatievlaanderen.ldes.ldi.RdfAdapter
      transformers:
        - name: be.vlaanderen.informatievlaanderen.ldes.ldi.SparqlConstructTransformer
          config:
            query: "bear-b.rq"
            infer: true
        - name: be.vlaanderen.informatievlaanderen.ldes.ldi.VersionObjectCreator
          config:
            member-type: https://www.w3.org/2002/07/owl#Thing
            delimiter: "_"
            versionOf-property: http://purl.org/dc/terms/isVersionOf
      outputs:
        - name: be.vlaanderen.informatievlaanderen.ldes.ldio.LdioHttpOut
          config:
            endpoint: http://ldesserver:8080/ldes
            content-type: application/n-quads

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
`,
  },
  bearBRq: {
    name: "bear-b.rq",
    config: () => `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX owl: <https://www.w3.org/2002/07/owl#>
PREFIX prov: <http://www.w3.org/ns/prov#>

CONSTRUCT {
    GRAPH ?s {
        ?s ?p ?o.
        ?s rdf:type owl:Thing.
        ?s prov:generatedAtTime ?timestamp.
    }
}
WHERE { 
    ?s ?p ?o .
    <https://aic.ai.wu.ac.at/qadlod/bear.html#BEAR-B> prov:generatedAtTime ?timestamp.    
    FILTER (?s != <https://aic.ai.wu.ac.at/qadlod/bear.html#BEAR-B>)
    }
`,
  },
  eventStreamConfig: {
    name: "evenstream.ttl",
    config: () => `
@prefix ldes:    <https://w3id.org/ldes#> .
@prefix tree:    <https://w3id.org/tree#>.
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix prov:    <http://www.w3.org/ns/prov#> .
@prefix sh:      <http://www.w3.org/ns/shacl#> .

</ldes> a ldes:EventStream ;
  tree:shape [ a sh:NodeShape ] ;
  ldes:timestampPath prov:generatedAtTime ;
  ldes:versionOfPath dcterms:isVersionOf .
`,
  },
  viewConfig: {
    name: "view.ttl",
    config: (pageSize: number) => `
@prefix tree:   <https://w3id.org/tree#>.
@prefix xsd:    <http://www.w3.org/2001/XMLSchema#> .
@prefix ldes:   <https://w3id.org/ldes#> .
@prefix prov:   <http://www.w3.org/ns/prov#> .

</ldes/paged> a tree:Node ;
  tree:viewDescription [
    a tree:ViewDescription ;
    tree:fragmentationStrategy  () ;
    ldes:retentionPolicy [
      a ldes:LatestVersionSubset ;
      ldes:amount 1 ;
    ] ;
    tree:pageSize "${pageSize}"^^<http://www.w3.org/2001/XMLSchema#int> ;
] .
`,
  },
};

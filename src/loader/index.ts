import {addNamespace, namespaces} from "../namespaces";
import {createRepository} from "./utils";
import {IDGenerator} from "../idGenerator/base";
import RDFRepositoryClientType from "graphdb/lib/repository/rdf-repository-client";

const {GraphDBServerClient, ServerClientConfig} = require('graphdb').server;

const {RepositoryClientConfig, RDFRepositoryClient, RepositoryConfig, RepositoryType} = require('graphdb').repository;
const {SparqlJsonResultParser, JsonLDParser} = require('graphdb').parser;
const {RDFMimeType, QueryContentType} = require('graphdb').http;
const {sleep} = require('../utils');

export * from "./utils";
export * from "./graphDBRepositoryConfig";

export let repository: RDFRepositoryClientType;

let dbClient: any
export let idGenerator: IDGenerator;

export async function getRepository() {
  while (!repository) {
    await sleep(100);
  }
  return repository;
}

export async function getIdGenerator() {
  while (!idGenerator) {
    await sleep(100);
  }
  return idGenerator;
}

export interface GraphDBUtilsConfig {
  // GraphDB Address
  address: string;
  username?: string;
  password?: string;
  // Repository to connect, create it if not exists.
  repositoryName: string;
  // Used when creating a new repository
  repositoryDescription?: string;
  // Used when creating a new repository
  repositoryConfig?: object;
  namespaces: { [key: string]: string };
  idGenerator: IDGenerator,
  debug?: boolean;
}


export async function initGraphDB(config: GraphDBUtilsConfig) {
  if (config.address.endsWith('/')) {
    config.address = config.address.slice(0, -1);
  }
  idGenerator = config.idGenerator;

  const serverConfig = new ServerClientConfig(config.address);

  if (config.username) {
    serverConfig.useGdbTokenAuthentication(config.username, config.password);
  }

  dbClient = new GraphDBServerClient(serverConfig);
  const ids = await dbClient.getRepositoryIDs();
  if (!ids.includes(config.repositoryName)) {
    await createRepository(dbClient, config.address, config.repositoryName, config.repositoryDescription || 'automatically created by graphdb-utils');
    console.log(`Repository \`${config.repositoryName}\` created.`)
  }
  const readTimeout = 30000;
  const writeTimeout = 30000;

  const clientConfig = new RepositoryClientConfig(config.address)
    .setEndpoints([`${config.address}/repositories/${config.repositoryName}`])
    .setHeaders({
      'Accept': RDFMimeType.SPARQL_RESULTS_JSON
    })
    .setReadTimeout(readTimeout)
    .setWriteTimeout(writeTimeout);

  if (config.username) {
    clientConfig.useGdbTokenAuthentication(config.username, config.password);
  }

  repository = new RDFRepositoryClient(clientConfig);

  // using https://github.com/rubensworks/sparqljson-parse.js
  repository.registerParser(new SparqlJsonResultParser());
  repository.registerParser(new JsonLDParser());

  console.log(`GraphDB ${config.repositoryName} connected.`);

  // Namespaces, this could be used within the query without specifying it in the prefixes
  Object.assign(namespaces, config.namespaces);
  if (namespaces[''] == null) {
    throw new Error("GDB Utils: Default namespace must be provided. \nExample: namespaces = {'': 'http://example'}");
  }
  const tasks = [];
  for (const [prefix, uri] of Object.entries(namespaces)) {
    if (prefix === '') continue;
    // console.log(prefix, uri)
    tasks.push(repository.saveNamespace(prefix, uri));
  }
  await Promise.all(tasks);

  console.log('GraphDB loaded.');
  return {
    repository, dbClient, idGenerator, namespaces
  }
}

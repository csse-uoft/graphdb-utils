import {getDefaultRepositoryConfig} from "./graphDBRepositoryConfig";
import fs from "fs";
import {repository} from "./index";
import {fetch} from "../utils";

const {RDFMimeType, QueryContentType} = require('graphdb').http;
const {RepositoryClientConfig, RDFRepositoryClient, RepositoryConfig, RepositoryType} = require('graphdb').repository;


/**
 * Return an array of number, [10, 0, 1] represents for version 10.0.1
 */
export async function getGraphDBVersion(address: string): Promise<number[]> {
  const {headers} = await fetch(address + '/protocol');
  try {
    return headers.get('server')!.match(/GraphDB(?:Free)?\/(.*) /)![1].split('.').map((num: string) => Number(num));
  } catch (e) {
    console.error("Cannot get GraphDB version, assuming version > 10");
    return [10, 0, 0];
  }
}

export async function createRepository(dbClient: any, address: string, repoName: string, description: string) {
  // Create repository configuration
  let config;
  const version = await getGraphDBVersion(address);
  console.log('GraphDB version:', version.join('.'));
  if (version[0] >= 10)
    config = new RepositoryConfig(repoName, '', getDefaultRepositoryConfig(), '', description, 'graphdb');
  else
    config = new RepositoryConfig(repoName, '', new Map(), '', description, 'free');
  // Use the configuration to create new repository
  await dbClient.createRepository(config);
}

export async function loadInitialData(repository: any, filename: string, overwrite = !!process.env.test) {
  const contentType = RDFMimeType.TURTLE;
  return new Promise<void>((resolve, reject) => {
    fs.readFile(filename, (err: any, stream: any) => {
      repository[overwrite ? 'overwrite' : 'upload'](stream, contentType, null, null)
        .then(() => resolve())
        .catch((reason: string) => reject(reason));
    });
  });
}

export async function importRepositorySnapshot(url: string) {
  const response = await fetch(url);

  return new Promise((resolve, reject) => {
    // @ts-ignore
    repository.upload(response.body, RDFMimeType.BINARY_RDF, null, null)
      .then(resolve)
      .catch((reason: any) => reject(reason));
  });
}
import {RequestInfo, RequestInit, Response} from "node-fetch";

export async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


// fetch@3 with dynamic import
export async function fetch(url: URL | RequestInfo, init?: RequestInit): Promise<Response> {
  const {default: fetch} = await import("node-fetch");
  return await fetch(url, init);
}

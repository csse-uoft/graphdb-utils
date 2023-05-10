export async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


// fetch@3 with dynamic import
// export async function fetch(url: URL | RequestInfo, init?: RequestInit): Promise<Response> {
export async function fetch(url: any, init?: any): Promise<any> {
  const {default: fetch} = await import("node-fetch");
  return await fetch(url, init);
}

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

export function streamToString(stream: any) {
  const chunks: any = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err: any) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  })
}

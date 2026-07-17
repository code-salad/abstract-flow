const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:3000";

const proxy = (request: Request): Promise<Response> => {
  const incoming = new URL(request.url);
  const upstream = new URL(API_ORIGIN);
  upstream.pathname = incoming.pathname.slice("/api".length);
  upstream.search = incoming.search;
  return fetch(new Request(upstream, request));
};

export const dynamic = "force-dynamic";
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;

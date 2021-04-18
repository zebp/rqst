import { zod } from "./deps.ts";

// TODO: Populate.
export interface RqstOptions {
  /**
   * Headers to be sent in the HTTP request.
   */
  headers: Record<string, string | number | boolean> | [string, string | number | boolean][],
}

/**
 * Options for reading the body of a response as json.
 */
export interface JsonOptions<T> {
  /**
   * If a content type of "application/json" is required for the response to be considered successful.
   */
  requireJsonContentType?: boolean,
  /**
   * Schema used to veryify the value of the json response. A zod error will be thrown if the response does not match this schema.
   */
  schema?: zod.ZodSchema<T>,
}

export class RqstClient {
  public get(url: string, options?: RqstOptions): Promise<RqstResponse> {
    return this.makeRequest(url, "GET", options);
  }

  // TODO: Make method a string union?
  private async makeRequest(url: string, method: string, options: RqstOptions = {
    headers: {}
  }): Promise<RqstResponse> {
    const headers: Record<string, string> = {};

    // Populate the fetch request headers with the provided headers in the options.
    if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => headers[key] = value.toString());
    } else {
      Object.entries(options.headers).forEach(([key, value]) => headers[key] = value.toString());
    }

    const innerResponse = await fetch(url, {
      method,
      headers,
    });

    return new RqstResponse(innerResponse);
  }
}

export class RqstResponse {
  private readonly inner: Response;

  public constructor(inner: Response) {
    this.inner = inner;
  }

  /**
   * Gets the body for it to be streamed in chunks, useful for cases where the entire body is too big to fit into memory.
   * 
   * @returns an async generator that can iterated over in byte chunks.
   */
  public async* body(): AsyncGenerator<Uint8Array, void, void> {
    const reader = this.inner.body?.getReader();

    if (!reader) {
      return;
    }

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (value) yield value;
        if (done) return;
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Reads the entirety of the response to a string and returns it.
   */
  public text(): Promise<string> {
    return this.inner.text();
  }

  /**
   * Reads the entirety of the response to a string then parses it.
   */
  public async json<T>(options: JsonOptions<T> = {
    requireJsonContentType: true
  }): Promise<T> {
    const contentType = this.inner.headers.get("Content-Type");

    // TODO: Make a custome error class that has a discriminated tag.
    if (options.requireJsonContentType && contentType !== "application/json") {
      throw new Error("invalid content type");
    }

    const raw = await this.inner.text();
    const bodyJson = JSON.parse(raw);

    if (options.schema) {
      const parsed = await options.schema.safeParseAsync(bodyJson);

      if (parsed.success) {
        return parsed.data;
      } else {
        throw parsed.error;
      }
    } else {
      return bodyJson as T;
    }
  }
}
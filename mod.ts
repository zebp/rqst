// TODO: Populate.
export interface RqstOptions { }

export class RqstClient {
  public async get(url: string, options?: RqstOptions): Promise<RqstResponse> {
    return this.makeRequest(url, "GET", options);
  }

  // TODO: Make method a string union?
  private async makeRequest(url: string, method: string, _options?: RqstOptions): Promise<RqstResponse> {
    const innerResponse = await fetch(url, {
      method,
    });

    return new RqstResponse(innerResponse);
  }
}

export class RqstResponse {
  private readonly inner: Response;

  public constructor(inner: Response) {
    this.inner = inner;
  }

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
}
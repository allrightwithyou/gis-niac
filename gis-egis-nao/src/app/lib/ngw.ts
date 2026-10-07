export interface WebMapItem {
  id: number;
  name: string;
  keyname?: string;
  description?: string;
}

interface NgwResourceItem {
  resource: {
    id: number;
    cls?: string;
    display_name: string;
    keyname?: string | null;
    description?: string | null;
  };
}

export async function getWebMaps(): Promise<WebMapItem[]> {
  const baseUrl = process.env.NGW_BASE_URL?.replace(/\/$/, "");

  if (!baseUrl) {
    throw new Error("NGW_BASE_URL is not set");
  }

  // search — все webmap, к которым есть доступ (не только parent=0)
  const url = `${baseUrl}/api/resource/search/?cls=webmap`;

  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (process.env.NGW_LOGIN && process.env.NGW_PASSWORD) {
    const token = Buffer.from(
      `${process.env.NGW_LOGIN}:${process.env.NGW_PASSWORD}`,
    ).toString("base64");
    headers.Authorization = `Basic ${token}`;
  }

  const response = await fetch(url, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`NGW search failed: ${response.status} ${url}`);
  }

  const resources: unknown = await response.json();

  if (!Array.isArray(resources)) {
    throw new Error("Unexpected response: resources is not an array");
  }

  console.log("getWebMaps count:", resources.length);

  return (resources as NgwResourceItem[])
    .filter((item) => item.resource?.cls === "webmap")
    .map((item) => {
      const resource = item.resource;
      return {
        id: resource.id,
        name: resource.display_name,
        keyname: resource.keyname ?? undefined,
        description: resource.description ?? undefined,
      };
    });
}

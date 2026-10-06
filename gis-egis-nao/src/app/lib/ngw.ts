import NgwConnector from "@nextgis/ngw-connector";

export const ngw = new NgwConnector({
  baseUrl: process.env.NEXT_PUBLIC_NGW_BASE_URL!,
});

interface WebMapItem {
  id: number;
  name: string;
  keyname?: string;
  description?: string;
}

export async function getWebMaps(): Promise<WebMapItem[]> {
  try {
    const resources = await ngw.getResourcesBy({ cls: "webmap" });

    if (!Array.isArray(resources)) {
      throw new Error("Unexpected response: resources is not an array");
    }

    console.log("getWebMaps response:", resources);

    return resources.map((item) => {
      const resource = item.resource;
      return {
        id: resource.id,
        name: resource.display_name,
        keyname: resource.keyname ?? undefined,
        description: resource.description ?? undefined,
      };
    });
  } catch (error) {
    console.error("getWebMaps failed:", error);
    throw error; // пробрасываем дальше, чтобы компонент мог обработать
  }
}

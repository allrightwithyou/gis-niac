"use client"
import NgwConnector from "@nextgis/ngw-connector";

export const ngw = new NgwConnector({
  baseUrl: process.env.NEXT_PUBLIC_NGW_BASE_URL!,
});

export async function getWebMaps() {
  try {
    const resources = await ngw.getResourcesBy({ cls: "webmap" });

    console.log("getWebMaps response:", resources);

    return resources.map((item: any) => ({
      id: item.resource.id,
      name: item.resource.display_name,
      keyname: item.resource.keyname,
      description: item.resource.description,
    }));
  } catch (error) {
    console.error("getWebMaps failed:", error);
    throw error;
  }
}

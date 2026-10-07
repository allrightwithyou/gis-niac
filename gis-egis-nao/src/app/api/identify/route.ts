import {
  NextResponse,
} from "next/server";

import NgwConnector from "@nextgis/ngw-connector";

interface IdentifyRequest {
  layerId: number;
  lat: number;
  lng: number;
}

interface IdentifyItem {
  properties?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  name?: string;
  feature?: {
    properties?: Record<string, unknown>;
  };

  [key: string]: unknown;
}

interface IdentifyResponse {
  items: IdentifyItem[];
  raw: unknown;
}

const baseUrl =
  process.env.NEXT_PUBLIC_NGW_BASE_URL;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function extractItems(
  value: unknown,
): IdentifyItem[] {
  if (!isRecord(value)) {
    return [];
  }

  if (Array.isArray(value.items)) {
    return value.items as IdentifyItem[];
  }

  if (Array.isArray(value.features)) {
    return value.features as IdentifyItem[];
  }

  if (
    value.feature &&
    isRecord(value.feature)
  ) {
    return [
      value.feature as IdentifyItem,
    ];
  }

  return [value as IdentifyItem];
}

function normalizeIdentify(
  value: unknown,
): IdentifyResponse | null {
  const items =
    extractItems(value);

  if (items.length === 0) {
    return null;
  }

  return {
    items,
    raw: value,
  };
}

export async function POST(
  request: Request,
) {
  try {
    if (!baseUrl) {
      return NextResponse.json(
        {
          error:
            "NEXT_PUBLIC_NGW_BASE_URL не задан",
        },
        {
          status: 500,
        },
      );
    }

    const body =
      (await request.json()) as Partial<IdentifyRequest>;

    const layerId =
      Number(body.layerId);

    const lat =
      Number(body.lat);

    const lng =
      Number(body.lng);

    if (
      !Number.isInteger(layerId) ||
      layerId <= 0 ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return NextResponse.json(
        {
          error:
            "Некорректные layerId, lat или lng",
        },
        {
          status: 400,
        },
      );
    }

    const ngw =
      new NgwConnector({
        baseUrl,
      });

    const result =
      await ngw.get(
        "feature_layer.identify",
        {
          query: {
            lat,
            lon: lng,
            lng,
            srs: 4326,
            layer_id: layerId,
          },
        },
      );

    const normalized =
      normalizeIdentify(result);

    return NextResponse.json(
      normalized ?? {
        items: [],
        raw: result,
      },
    );
  } catch (error) {
    console.error(
      "Ошибка NextGIS identify:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ошибка identify",
      },
      {
        status: 500,
      },
    );
  }
}
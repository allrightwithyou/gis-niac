
export interface IdentifyItem {
  layerId: number;
  feature: {
    id?: number;
    properties: Record<string, unknown>;
    geometry?: unknown;
  };
  geojson?: () => Promise<GeoJSON.Feature>;
}

export interface IdentifyResult {
  items: IdentifyItem[];
  raw: unknown;
}

export interface LayerField {
  keyname: string;
  display_name: string;
  grid_visibility: boolean;
  datatype: string;
}

export interface LayerResource {
  id: number;
  display_name: string;
  feature_layer?: {
    fields: LayerField[];
  };
}

export interface WebMapItem {
  item_type: "layer" | "group" | "root";
  display_name?: string;
  layer_enabled?: boolean;
  layer_identifiable?: boolean;
  layer_min_scale_denom?: number | null;
  layer_max_scale_denom?: number | null;
  children?: WebMapItem[];
  style_parent_id?: number;
}

export interface Layer {
  id: string;
  name: string;
  active: boolean;
  resourceId?: number;
  legendExpanded?: boolean;
}

export interface BaseLayer {
  id: string;
  name: string;
  visible: boolean;
}

export interface LegendItem {
  name: string;
  symbol: {
    format: string;
    data: string;
  };
}

export interface SectionData {
  name: string;
  title: string;
}

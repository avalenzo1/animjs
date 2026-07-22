import { produce, Draft } from "immer";

type LayerAction =
  | { type: "clear_all_layers" }
  | { type: "toggle_layer_visible"; id: string }
  | { type: "toggle_layer_lock"; id: string }
  | { type: "change_layer_name"; id: string; name: string }
  | { type: "add_layer"; id: string; name: string, locked?: boolean, visible?: boolean }
  | { type: "move_layer_down"; layerIndex: number }
  | { type: "move_layer_up"; layerIndex: number }
  | { type: "frame_update"; layerIndex: number; frames: number[] };

export type ReducedLayer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  frames: number[];
}; 
  
const layerReducer = (
  draft: Draft<ReducedLayer[]>,
  action: LayerAction
): void => {
  let layer: Draft<ReducedLayer> | undefined;
  let nextLayerIndex: number;

  switch (action.type) {
    case "clear_all_layers":
      draft.length = 0;
      break;

    case "toggle_layer_visible":
      layer = draft.find((layer) => layer.id === action.id);
      if (layer) {
      console.log("GHello?")
      console.log(layer.id);

        layer.visible = !layer.visible;
      }
      break;

    case "toggle_layer_lock":
      layer = draft.find((layer) => layer.id === action.id);
      if (layer) {
        layer.locked = !layer.locked;
      }
      break;

    case "change_layer_name":
      layer = draft.find((layer) => layer.id === action.id);
      if (layer) {
        layer.name = action.name;
      }
      break;

    case "add_layer":
      draft.push({
        id: action.id,
        name: action.name,
        visible: action.visible != undefined ? action.visible : true,
        locked: action.locked != undefined  ? action.locked : false,
        frames: [],
      });
      break;

    case "move_layer_down":
      nextLayerIndex = action.layerIndex + 1;

      if (nextLayerIndex < draft.length) {
        [draft[action.layerIndex], draft[nextLayerIndex]] = [
          draft[nextLayerIndex],
          draft[action.layerIndex],
        ];
      }
      break;

    case "move_layer_up":
      nextLayerIndex = action.layerIndex - 1;

      if (nextLayerIndex >= 0) {
        [draft[action.layerIndex], draft[nextLayerIndex]] = [
          draft[nextLayerIndex],
          draft[action.layerIndex],
        ];
      }
      break;

    case "frame_update":
      draft[action.layerIndex].frames = action.frames;
      break;
  }
};

export default produce(layerReducer);
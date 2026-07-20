import { produce } from "immer";
import { Layer } from "../lib/Anim";

const layerReducer = (draft, action) => {
  let layer: Layer, nextLayerIndex: number;
  switch (action.type) {
    case "clear_all_layers":
      draft.length = 0;
      break;
    case "toggle_layer_visible":
      layer = draft.find((layer: Layer) => layer.id === action.id);
      layer.visible = !layer.visible;
      break;
    case "toggle_layer_lock":
      layer = draft.find((layer: Layer) => layer.id === action.id);
      layer.locked = !layer.locked;
      break;
    case "change_layer_name":
      layer = draft.find((layer: Layer) => layer.id === action.id);
      layer.name = action.name;
      break;
    case "add_layer":
      draft.push({
        id: action.id,
        name: action.name,
        visible: true,
        locked: false,
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
      layer = draft[action.layerIndex];
      layer.frames = action.frames;
      break;
    default:
      break;
  }
};

export default produce(layerReducer);

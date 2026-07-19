import { produce } from "immer";
import { Layer } from "../lib/Anim";

const layerReducer = (draft, action) => {
    let layer: Layer;
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
            console.log("hello?");
            draft.push({
                id: action.id,
                name: action.name,
                visible: true,
                locked: false,
            });
            console.log(draft);
            break;
        default:
            break;
    }
};

export default produce(layerReducer);
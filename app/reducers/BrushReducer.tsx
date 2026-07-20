import { Draft, produce } from "immer";
import { Brush } from "../lib/Anim";

export enum E_BrushAction {
CLEAR_ALL_BRUSHES = 'clear_all_brushes',
  ADD_BRUSH = 'add_brush',
  REMOVE_BRUSH = 'remove_brush',
  SET_BRUSH = 'set_brush',
}

// An interface for our actions
export interface BrushAction {
  type: E_BrushAction;
  brush?: Brush;
  index?: number;
}

// Our reducer function that uses a switch statement to handle our actions
function brushReducer(draft: Draft<Brush>[], action: BrushAction) {
  const { type, brush, index } = action;
  switch (type) {
    case E_BrushAction.CLEAR_ALL_BRUSHES:
        draft.length = 0;
      break;
    case E_BrushAction.ADD_BRUSH:
        if (!brush) break;
        draft.push(brush);
        console.log("Add Brush");
        console.log(draft);
      break;
    case E_BrushAction.REMOVE_BRUSH:
        if (!index) break;
        draft.splice(index, 1);
      break;
    case E_BrushAction.SET_BRUSH:
        if (!index || !draft[index] || !brush) break;
        
        draft[index] = brush;
      break;
    default:
      console.warn("Invalid brush action: " + action.type);
  }
}

export default produce(brushReducer);
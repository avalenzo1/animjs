import { IconPlus, IconTrashFilled } from "@tabler/icons-react";
import BrushIcon from "./BrushIcon";
import { Brush } from "../lib/Anim";
import { useCallback } from "react";
import { BrushAction, E_BrushAction } from "../reducers/BrushReducer";

type BrushProps = {
  brushes: Brush[];
  dispatch: (action: BrushAction) => void;
  activeBrush: Brush;
  setBrush: (brush: Brush) => void;
};

export default function Brushes({ brushes, dispatch, activeBrush, setBrush }: BrushProps) {
  const changeBrushColor = useCallback((index: number, brush: Brush, color: string) => {
    const newBrush = {...brush, color};
    dispatch({ type: E_BrushAction.SET_BRUSH, index, brush: newBrush });
    setBrush(newBrush);

  }, [dispatch, setBrush]);

  const changeBrushSize = useCallback((index: number, brush: Brush, size: number) => {
    const newBrush = {...brush, size};
    dispatch({ type: E_BrushAction.SET_BRUSH, index, brush: newBrush });
    setBrush(newBrush);
  }, [dispatch, setBrush]);

  const removeBrush = useCallback((index: number) => {
    dispatch({ type: E_BrushAction.REMOVE_BRUSH, index });
  }, [dispatch]);

  return (
    <div>
      {/* {JSON.stringify(brushes)} */}
      {brushes.map((brush: Brush, index: number) => (
        <div key={index} className="btn-group__btn-check">
          <input type="radio" id={`brush-${String(index)}`} checked={activeBrush.id === brush.id} onChange={() => setBrush(brush)}></input>
          <label
            htmlFor={`brush-${String(index)}`}
            className={`btn btn--primary p-0!`}
          >
            <BrushIcon brush={brush} size={48} />
          </label>

          <div className={`popover ${activeBrush.id === brush.id ? "" : "hidden!"}`}>
            <button className="btn btn--danger" onClick={() => removeBrush(index)}><IconTrashFilled /></button>
            <div>
              <input className="h-full" value={brush.color} onChange={(e) => changeBrushColor(index, brush, e.target.value)} type="color"></input>
            </div>
            <div>
              <input value={brush.size} onChange={(e) => changeBrushSize(index, brush, Number(e.target.value))} type="range" min={1} max={200}></input>
            </div>
          </div>
        </div>
      ))}

      <button
        className="btn btn--primary p-0!"
        onClick={() => dispatch({ type: E_BrushAction.ADD_BRUSH, brush: new Brush()})}
      >
        <IconPlus size={48} />
      </button>
    </div>
  );
}

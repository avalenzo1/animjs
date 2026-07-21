import { IconPlus, IconTrashFilled } from "@tabler/icons-react";
import BrushIcon from "./BrushIcon";
import { Brush } from "../lib/Anim";
import { useCallback, useState } from "react";
import { BrushAction, E_BrushAction } from "../reducers/BrushReducer";
import OutsideAlerter from "./OutsideAlerter";

type BrushProps = {
  brushes: Brush[];
  dispatch: (action: BrushAction) => void;
  activeBrush: Brush;
  setBrush: (brush: Brush) => void;
};

export default function Brushes({
  brushes,
  dispatch,
  activeBrush,
  setBrush,
}: BrushProps) {
  const [isVisible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const changeBrushColor = useCallback(
    (brush: Brush, color: string) => {
      const index = brushes.findIndex((brush) => brush.id === activeBrush.id);
      const newBrush = { ...brush, color };
      dispatch({ type: E_BrushAction.SET_BRUSH, index, brush: newBrush });
      setBrush(newBrush);
    },
    [dispatch, setBrush],
  );

  const changeBrushSize = useCallback(
    (brush: Brush, size: number) => {
      const index = brushes.findIndex((brush) => brush.id === activeBrush.id);

      const newBrush = { ...brush, size };
      dispatch({ type: E_BrushAction.SET_BRUSH, index, brush: newBrush });
      setBrush(newBrush);
    },
    [dispatch, setBrush],
  );

  const changeBrushLineCap = useCallback(
    (brush: Brush, lineCap: string) => {
      const index = brushes.findIndex((brush) => brush.id === activeBrush.id);

      const newBrush = { ...brush, lineCap };
      dispatch({ type: E_BrushAction.SET_BRUSH, index, brush: newBrush });
      setBrush(newBrush);
    },
    [dispatch, setBrush],
  );

  const removeBrush = useCallback(() => {
    const index = brushes.findIndex((brush) => brush.id === activeBrush.id);
    dispatch({ type: E_BrushAction.REMOVE_BRUSH, index });
  }, [dispatch]);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();

    setPosition({ x: e.clientX, y: e.clientY });
    setVisible(true);
  }, []);

  return (
    <div>
      {brushes.map((brush: Brush, index: number) => (
        <div
          key={index}
          className="btn-group__btn-check"
          onContextMenu={(e) => handleContextMenu(e)}
        >
          <input
            type="radio"
            id={`brush-${String(index)}`}
            checked={activeBrush.id === brush.id}
            onChange={() => setBrush(brush)}
          ></input>
          <label
            htmlFor={`brush-${String(index)}`}
            className={`btn btn--primary p-0!`}
          >
            <BrushIcon brush={brush} size={48} />
          </label>
        </div>
      ))}

      <OutsideAlerter onEscape={() => setVisible(false)}>
        <div
          className={`popover ${isVisible ? "popover--show" : ""}`}
          style={{ left: position.x, top: position.y }}
        >
          <button className="btn btn--danger" onClick={() => removeBrush()}>
            <IconTrashFilled />
          </button>
          <div>
            <input
              className="h-full"
              value={activeBrush.color}
              onChange={(e) => changeBrushColor(activeBrush, e.target.value)}
              type="color"
            ></input>
          </div>
          <div>
            <input
              value={activeBrush.size}
              onChange={(e) =>
                changeBrushSize(activeBrush, Number(e.target.value))
              }
              type="range"
              min={1}
              max={200}
            ></input>
          </div>
          <div>
            <input
              value={activeBrush.lineCap}
              onChange={(e) => changeBrushLineCap(activeBrush, e.target.value)}
            ></input>
          </div>
        </div>
      </OutsideAlerter>

      <button
        className="btn btn--primary p-0!"
        onClick={() =>
          dispatch({ type: E_BrushAction.ADD_BRUSH, brush: new Brush() })
        }
      >
        <IconPlus size={48} />
      </button>
    </div>
  );
}

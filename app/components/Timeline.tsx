"use client";

import {
  IconEye,
  IconEyeClosed,
  IconFileImport,
  IconLayersSubtract,
  IconLock,
  IconLockOpen,
  IconPlus,
  IconSelector,
  IconPlayerPause,
  IconPlayerPlay,
  IconRepeat,
  IconRepeatOff,
} from "@tabler/icons-react";
import { Frame, Layer } from "../lib/Anim";
import { useRef, useState } from "react";

type TimelineProps = {
  currentLayer: number,
  currentFrame: number,
  frameRange: number[],
  layers: Layer[],
  playing: boolean,
  isLooping: boolean,
  onToggleLoop: Function,
  onTogglePlay: Function,
  onToggleLock: Function,
  onToggleVisible: Funtion,
  onAddLayer: Function,
  onChangeLayerName: Function
};

export default function Timeline({
  currentFrame,
  currentLayer,
  frameRange,
  layers,
  playing,
  isLooping,
  onToggleLoop,
  onTogglePlay,
  onToggleLock,
  onToggleVisible,
  onActiveLayer,
  onAddLayer,
  onChangeLayerName,
}: TimelineProps) {
  const layersRef = useRef<HTMLDivElement|null>(null);
  const tickRef = useRef<HTMLDivElement|null>(null);
  const graphRef = useRef<HTMLDivElement|null>(null);
  const playerRef = useRef<HTMLDivElement|null>(null);

  const [posX, setPosX] = useState(0);
  const [active, setActive] = useState(false);
  const ticks = [];
  const time = 25;

  for (let i = 0; i < time; ++i) {
    ticks.push(
      <div key={i} className="not-first:-ml-px!">
        <span className="-ml-2!">{i}s</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="276"
          height="13"
          viewBox="0 0 276 13"
          fill="none"
          color="var(--border-light)"
        >
          <g clipPath="url(#clip0_136_382)">
            <line x1="275.5" y1="13" x2="275.5" stroke="currentColor" />
            <line x1="11.5" y1="13" x2="11.5" y2="5" stroke="currentColor" />
            <line x1="23.5" y1="13" x2="23.5" y2="5" stroke="currentColor" />
            <line x1="36.5" y1="13" x2="36.5" y2="5" stroke="currentColor" />
            <line x1="47.5" y1="13" x2="47.5" y2="5" stroke="currentColor" />
            <line x1="59.5" y1="13" x2="59.5" y2="2" stroke="currentColor" />
            <line x1="71.5" y1="13" x2="71.5" y2="5" stroke="currentColor" />
            <line x1="83.5" y1="13" x2="83.5" y2="5" stroke="currentColor" />
            <line x1="95.5" y1="13" x2="95.5" y2="5" stroke="currentColor" />
            <line x1="107.5" y1="13" x2="107.5" y2="5" stroke="currentColor" />
            <line x1="119.5" y1="13" x2="119.5" y2="5" stroke="currentColor" />
            <line x1="131.5" y1="13" x2="131.5" y2="2" stroke="currentColor" />
            <line x1="143.5" y1="13" x2="143.5" y2="5" stroke="currentColor" />
            <line x1="190.5" y1="13" x2="190.5" y2="5" stroke="currentColor" />
            <line x1="203.5" y1="13" x2="203.5" y2="2" stroke="currentColor" />
            <line x1="215.5" y1="13" x2="215.5" y2="5" stroke="currentColor" />
            <line x1="228.5" y1="13" x2="228.5" y2="5" stroke="currentColor" />
            <line x1="239.5" y1="13" x2="239.5" y2="5" stroke="currentColor" />
            <line x1="251.5" y1="13" x2="251.5" y2="5" stroke="currentColor" />
            <line x1="264.5" y1="13" x2="264.5" y2="5" stroke="currentColor" />
            <line x1="155.5" y1="13" x2="155.5" y2="5" stroke="currentColor" />
            <line x1="167.5" y1="13" x2="167.5" y2="5" stroke="currentColor" />
            <line x1="179.5" y1="13" x2="179.5" y2="5" stroke="currentColor" />
            <line x1="0.5" y1="13" x2="0.5" stroke="currentColor" />
          </g>
          <defs>
            <clipPath id="clip0_136_382">
              <rect width="276" height="13" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </div>,
    );
  }

  function handleMouseDown(clientX: number) {
    setActive(true);
    handleMouseMove(clientX);
  }

  function handleMouseMove(clientX: number) {
    if (!tickRef.current || !graphRef.current || !active) return;

    const tickBoundingRect = tickRef.current.getBoundingClientRect();

    const timelineRange = (clientX - tickBoundingRect.x - graphRef.current.scrollLeft) / (graphRef.current.offsetWidth);
    
    if (timelineRange > 0.975) {
        graphRef.current.scrollLeft += graphRef.current.offsetWidth * 0.025;
    }

    else if (timelineRange < 0.025) {
        graphRef.current.scrollLeft -= graphRef.current.offsetWidth * 0.025;
    }

    console.log(Math.min(Math.max(0, clientX - tickBoundingRect.x), graphRef.current.scrollWidth) / graphRef.current.scrollWidth)
  }

  function syncTimeline(e: React.DragEvent<HTMLDivElement>) {
    if (!playerRef.current || !graphRef.current || !layersRef.current) return;

    if (e.target == graphRef.current) {
        layersRef.current.scrollTop = graphRef.current.scrollTop;
    }
    
    if (e.target == layersRef.current) {
        graphRef.current.scrollTop = layersRef.current.scrollTop;
    }

    playerRef.current.style.top = `${graphRef.current.scrollTop}px`;
  }

  function handleMouseUp() {
    setActive(false);
  }

  return (
    <div
      className="footer"
      onMouseMove={(e) => handleMouseMove(e.clientX)}
      onMouseUp={() => handleMouseUp()}
    >
      <div className="playbar">
        <button className="btn btn--primary" onClick={() => onTogglePlay()}>
          {playing ? (
            <IconPlayerPause size={12} />
          ) : (
            <IconPlayerPlay size={12} />
          )}
        </button>

        <button className="btn btn--primary" onClick={() => onToggleLoop()}>
          {isLooping ? (
            <IconRepeatOff size={12} />
          ) : (
            <IconRepeat size={12} />
          )}
        </button>
      </div>

      <div className="flex flex-grow select-none">
        <div className="flex flex-col border-r border-[color:var(--border-light)] h-[25vh] z-1 shadow-[2px_2px_2px_var(--border-light)]">
          <div className="px-4! py-3! b-2 border-b border-[color:var(--border-light)] flex justify-between">
            Timeline

            <div className="flex gap-2">
                <button className="btn btn--primary">
                    <IconFileImport size={12} />
                </button>
                <button className="btn btn--primary" onClick={onAddLayer}>
                    <IconPlus size={12} />
                </button>
            </div>
          </div>

          <div className="flex-1 overflow-scroll no-scrollbar h-[15vh]" ref={layersRef} onScroll={syncTimeline}>
            {/* {JSON.stringify(layers)} */}
            {layers.map((layer: Layer, index: number) => (
              <div
                key={index}
                draggable={true}
                onDragStart={(e) => console.log(e)}
                onDrag={(e) => console.log(e)}
                onDragEnd={(e) => console.log(e)}
                className="flex items-center cursor-grab pl-0! px-4! py-1! border-b border-[color:var(--border-light)] last:border-b-0"
                style={{backgroundColor: index === currentLayer ? "var(--primary-active)" : ""}}
                 onClick={() => onActiveLayer(index)}
              >
                <IconSelector size={14} color="grey" />
                <IconLayersSubtract size={14} className="mr-1" />

                <input
                  value={layer.name}
                  onChange={(e) => {
                    onChangeLayerName(layer.id, e.target.value);
                  }}
                />

                <div className="flex gap-2">
                  <button
                    className="btn btn--primary"
                    onClick={() => onToggleLock(layer.id)}
                  >
                    {layer.locked ? (
                      <IconLock size={12} />
                    ) : (
                      <IconLockOpen size={12} />
                    )}
                  </button>

                  <button
                    className="btn btn--primary"
                    onClick={() => onToggleVisible(layer.id)}
                  >
                    {layer.visible ? (
                      <IconEye size={12} />
                    ) : (
                      <IconEyeClosed size={12} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="relative flex-grow overflow-scroll h-[25vh]"
          style={{ paddingLeft: 10 }}
          onScroll={(e) => syncTimeline(e)}
          ref={graphRef}
        >
          <div onMouseDown={(e) => handleMouseDown(e.clientX)} ref={tickRef} className="flex" style={{paddingTop: 12, position: "sticky", top: 0, backgroundColor: "var(--bg-surface)"}}>
            {ticks}
          </div>       

          <div className="range">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 11 11" fill="none">
              <g clipPath="url(#clip0_182_2)">
                <path d="M11 0H0V11L11 0Z" fill="currentColor"/>
              </g>
              <defs>
                <clipPath id="clip0_182_2">
                  <rect width="11" height="11" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          </div>

          <div className="range" style={{left: `${frameRange[1] * 12}px`}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 11 11" fill="none">
              <g clipPath="url(#clip0_182_5)">
                <path d="M11 0H0L11 11V0Z" fill="currentColor"/>
              </g>
              <defs>
                <clipPath id="clip0_182_5">
                  <rect width="11" height="11" fill="white"/>
                </clipPath>
              </defs> 
            </svg>
          </div>

          <div
            ref={playerRef}
            className="player"
            style={{ left: `${currentFrame * 12}px` }}
          >
            <div className="player__head">
              <svg
                width="11"
                height="16"
                viewBox="0 0 11 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clipPath="url(#clip0_137_383)">
                  <path d="M11 0H0V12L5 16H6L11 12V0Z" fill="currentColor" />
                </g>
              </svg>
            </div>
            <div className="player__body" />
          </div>

          <div className="flex flex-col gap-[1px]">
            {layers.map((layer: Layer, index: number) => <div key={index}>
              <div className="bg-neutral-600 text-white rounded overflow-hidden" style={{width:11, height: 30}}></div>
                    {/* {layer.frames.map((frame: Frame, index: number) => <div key={index} className="bg-neutral-600 text-white rounded overflow-hidden" style={{width:11, height: 30}}></div>)} */}
                </div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

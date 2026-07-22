"use client";

import MenuBar from "./components/MenuBar";
import Stage, { StageRef } from "./components/Stage";
import Image from "next/image";
import { ThemeContext } from "./ThemeContext";
import {
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import Toolbar, { Tool } from "./components/Toolbar";
import ProgressBar from "./components/ProgressBar";
import {
  IconHandStop,
  IconBrush,
  IconBucketDroplet,
  IconEraser,
  IconPlus,
} from "@tabler/icons-react";
import {
  AnimObject,
  AnimRef,
  Brush,
  Camera,
  E_Mode,
  Layer,
  UUID,
  Vector,
} from "./lib/Anim";
import Timeline from "./components/Timeline";
import SplashScreen from "./components/SplashScreen";
import layerReducer from "./reducers/LayerReducer";
import brushReducer, { E_BrushAction } from "./reducers/BrushReducer";
import Brushes from "./components/Brushes";

// class Project {
//     uuid: string;
//     name: string;
//     fps: number;
//     width: number;
//     height: number;
//     layers: Layer[];
//     playing: boolean;

//     constructor() {
//         this.uuid = UUID();
//         this.name = "Unnamed Project";
//         this.fps = 24;
//         this.width = 1920;
//         this.height = 1080;
//         this.layers = [];
//         this.playing = false;

//         console.log(`"${this.name}" initialized with ID ${this.uuid}.`)
//     }
// }

const createSaveFilePicker = async (
  fileName: string,
): Promise<FileSystemFileHandle|undefined> => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const fileHandle = await window.showSaveFilePicker({
    suggestedName: fileName,
  });

  return fileHandle;
};

export default function Home() {
  const { theme, setTheme } = useContext(ThemeContext);
  // TODO: Fix naming conventions of variables
  const [brushes, brushDispatch] = useReducer(brushReducer, [new Brush()]);
  const [brush, setBrush] = useState(brushes[0]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [isLooping, setLooping] = useState(false);
  const [mode, setMode] = useState(E_Mode.BRUSH);
  const [currentLayer, setCurrentLayer] = useState(0);
  const [frameRange, setFrameRange] = useState([0, 23]);
  const [cachedFileHandle, setCachedFileHandle] = useState<FileSystemFileHandle|null>(null);
  const [metadata, setMetadata] = useState({
    width: 1920,
    height: 1080,
    fps: 24,
  });
  const stageRef = useRef<StageRef | null>(null);
  const animRef = useRef<AnimRef | null>(null);
  const [layers, layerDispatch] = useReducer(layerReducer, []);

  // If animRef is null, initialize it.
  if (animRef.current == null) {
    animRef.current = {
    
      metadata: {
        width: 1920,
        height: 1080,
        fps: 24,
      },
      history: [],
      onion: {
        enabled: true,
        layers: 5,
      },
      brushes: [],
      brush: new Brush(),
      mode: E_Mode.BRUSH,
      camera: new Camera(),
      isPlaying: false,
      isExporting: false,
      isLooping: false,
      currentFrameIndex: 0,
      currentLayerIndex: 0,
      frameRange: [0, 23],
      mouse: new Vector(),
      layers: [],
      activeAnimObject: null,
      isPointerDown: false,
    };

    brushDispatch({ type: E_BrushAction.CLEAR_ALL_BRUSHES });
    brushDispatch({ type: E_BrushAction.ADD_BRUSH, brush: new Brush() });
  }

  const updateTimeline = useCallback(() => {
    if (stageRef.current == null) return;

    const timeline = stageRef.current.getTimeline();

    if (!timeline) return;

    for (let i = 0; i < timeline.length; ++i) {
      const frames = timeline[i];

      layerDispatch({ type: "frame_update", layerIndex: i, frames });
    }
  }, []);

  const changeLayerName = useCallback((id: string, name: string) => {
    if (!stageRef.current) return;

    const layer = stageRef.current.getLayerById(id);

    if (!layer) return;

    layer.name = name;

    layerDispatch({ id, name, type: "change_layer_name" });
  }, []);

  const toggleLock = useCallback((id: string) => {
    if (!stageRef.current) return;

    const layer = stageRef.current.getLayerById(id);

    if (!layer) return;

    layer.locked = !layer.locked;

    layerDispatch({ id, type: "toggle_layer_lock" });
  }, []);

  const toggleVisible = useCallback((id: string) => {
    if (!stageRef.current) return;

    const layer = stageRef.current.getLayerById(id);

    if (!layer) return;

    layer.visible = !layer.visible;

    layerDispatch({ id, type: "toggle_layer_visible" });
  }, []);

  const addLayer = useCallback(() => {
    if (!animRef.current) return;

    const newLayer = new Layer("New Layer");

    animRef.current.layers.push(newLayer);

    layerDispatch({ type: "add_layer", id: newLayer.id, name: newLayer.name });

    updateTimeline();
  }, [updateTimeline]);

  function togglePlay() {
    setPlaying((playing) => {
      if (animRef.current) animRef.current.isPlaying = !playing;

      return !playing;
    });
  }

  function toggleLoop() {
    setLooping((isLooping) => {
      if (animRef.current) animRef.current.isLooping = !isLooping;

      return !isLooping;
    });
  }

  // https://stackblitz.com/edit/continuous-saving-file-browser?file=src%2FApp.tsx
  /**
   * saveFile
   *
   * Saves current Anim Project as file
   */
  const saveFile = useCallback(
    async (forceSaveAs = false) => {
      if (typeof window === "undefined" || animRef.current == null) {
        return;
      }

      const animJSON = JSON.stringify({
        version: 1.1,
        metadata: animRef.current.metadata,
        camera: animRef.current.camera,
        layers: animRef.current.layers,
        frameRange: animRef.current.frameRange,
        currentFrameIndex: animRef.current.currentFrameIndex,
        currentLayerIndex: animRef.current.currentLayerIndex,
        brush: animRef.current.brush,
        brushes: animRef.current.brushes,
      });

      console.log(animJSON)

      const blob = new Blob([animJSON], { type: "text/plain" });
      const fileName = "AnimProject.anim";

      if (typeof window.showSaveFilePicker === "function") {
        try {
          let fileHandle: FileSystemFileHandle | undefined;

          if (cachedFileHandle && forceSaveAs == false) {
            console.log("wdhniosndfgosbndjofbn");
            fileHandle = cachedFileHandle;
          } else {
            console.log("test");
            fileHandle = await createSaveFilePicker(fileName);

            if (!fileHandle) {
              return;
            }
            
            setCachedFileHandle(fileHandle);
          }

          console.log(fileHandle);

          const writable = await fileHandle.createWritable();

          await writable.write(blob);
          await writable.close();
        } catch (error) {
          console.error("Error selecting a file:", error);
          return null;
        }
      } else {
        const a = document.createElement("a");
        a.href = window.URL.createObjectURL(blob);
        a.download = fileName;

        // Trigger the download
        a.click();

        // Clean up
        window.URL.revokeObjectURL(a.href);
      }
    },
    [cachedFileHandle],
  );

  const openFile = useCallback(async () => {
    if (animRef.current == null || stageRef.current == null) return;

    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: "anim",
          accept: { "application/json": [".anim"] },
        },
      ],
    });

    const file = await fileHandle.getFile();
    const json = JSON.parse(await file.text());

    layerDispatch({ type: "clear_all_layers" });
    brushDispatch({ type: E_BrushAction.CLEAR_ALL_BRUSHES });

    // console.log(json);

    animRef.current.layers = [];
    animRef.current.metadata = json.metadata;
    animRef.current.camera = Camera.fromJSON(json.camera);
    animRef.current.frameRange = json.frameRange;
    animRef.current.currentFrameIndex = json.currentFrameIndex;
    animRef.current.currentLayerIndex = json.currentLayerIndex;

    if (json.brushes) {
      for (const brush of json.brushes) {
        brushDispatch({ type: E_BrushAction.ADD_BRUSH, brush });
      }
    }

    for (const layer of json.layers) {
      layerDispatch({ type: "add_layer", id: layer.id, name: layer.name, visible: layer.visible, locked: layer.locked });
      animRef.current.layers.push(Layer.fromJSON(layer));
    }
    console.log(animRef.current.layers);

    setCurrentLayer(json.currentLayerIndex);

    // layerDispatch event so that player tick updates without rerendering
    const event = new CustomEvent("anim-frame-update", {
      detail: animRef.current.currentFrameIndex,
    });
    window.dispatchEvent(event);

    updateTimeline();

    setCachedFileHandle(fileHandle);
  }, [updateTimeline]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isModifierPressed = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      /**
       * History shortcuts
       */

      // Undo
      if (isModifierPressed && !e.shiftKey && key === "z") {
        e.preventDefault();

        if (stageRef.current) stageRef.current.history.undo();

        return;
      }

      if (isModifierPressed && e.shiftKey && key === "z") {
        e.preventDefault();

        if (stageRef.current) stageRef.current.history.redo();

        return;
      }

      /**
       * Timeline shortcuts
       */
      if (key === "p" || key === " ") {
        togglePlay();
      }

      if (key === "l") {
        toggleLoop();
      }

      if (key === ",") {
        if (stageRef.current) stageRef.current.player.prevFrame();
      }

      if (key === ".") {
        if (stageRef.current) stageRef.current.player.nextFrame();
      }

      /**
       * File shortcuts
       */
      if (isModifierPressed && key === "s") {
        e.preventDefault();

        saveFile(e.shiftKey);

        return;
      }

      if (isModifierPressed && key === "o") {
        e.preventDefault();

        openFile();

        return;
      }

      if (isModifierPressed && key === "e") {
        e.preventDefault();

        console.log("Exporting...");

        if (stageRef.current) stageRef.current.exportVideo();

        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openFile, saveFile]);

  useEffect(() => {
    addLayer();
  }, [addLayer]);

  useEffect(() => {
    if (!animRef.current) return;

    animRef.current.brushes = brushes;
  }, [brushes]);

  useEffect(() => {
    if (!animRef.current) return;

    animRef.current.mode = mode;
  }, [mode]);

  useEffect(() => {
    if (!animRef.current) return;

    animRef.current.brush = brush;
  }, [brush]);

  useEffect(() => {
    if (!animRef.current) return;

    animRef.current.currentLayerIndex = currentLayer;
  }, [currentLayer]);

  // Models
  const menuModel = [
    {
      icon:
        theme === "light" ? (
          <Image src="/anim.svg" width={17} height={17} alt="Anim.JS logo" />
        ) : (
          <Image
            src="/animDark.svg"
            width={17}
            height={17}
            alt="Anim.JS logo"
          />
        ),
      label: "Anim.JS",
      items: [
        {
          label: "Settings",
          action: () => {},
        },
        {
          label: "Change Theme",
          action: () => {
            setTheme((prev) => (prev === "light" ? "dark" : "light"));
          },
        },
        {
          label: "About",
          action: () => {
            alert("About");
          },
        },
      ],
    },
    {
      label: "File",
      items: [
        {
          label: "Open",
          action: openFile,
        },
        {
          label: "New",
          action: () => {},
        },
        {
          label: "Save",
          action: saveFile,
        },
        {
          label: "Save File As...",
          action: () => {
            saveFile(true);
          },
        },
        "hr",
        {
          label: "Export",
          action: () => { if (stageRef.current) stageRef.current.exportVideo() },
        },
      ],
    },
  ];
  const toolsModel: Tool[] = [
    {
      label: "Hand",
      icon: <IconHandStop size={14} />,
      mode: E_Mode.HAND,
    },
    {
      label: "Brush",
      icon: <IconBrush size={14} />,
      mode: E_Mode.BRUSH,
    },
    {
      label: "Bucket",
      icon: <IconBucketDroplet size={14} />,
      mode: E_Mode.BUCKET,
    },
    {
      label: "Eraser",
      icon: <IconEraser size={14} />,
      mode: E_Mode.ERASER,
    },
  ];

  const onReady = useCallback(() => {
    setLoading(false);
  }, []);

  const onPlayEnd = useCallback(() => {
    if (animRef.current == null) return;

    setPlaying(false);

    const { frameRange } = animRef.current;

    animRef.current.currentFrameIndex = frameRange[0];
  }, []);

  const changeCurrentFrame = useCallback((nextFrame: number) => {
    if (stageRef.current) stageRef.current.player.setCurrentFrame(nextFrame);
  }, []);

  const setActiveLayer = useCallback(
    (newLayerIndex: number) => setCurrentLayer(newLayerIndex),
    [],
  );

  const changeFrameRange = useCallback(
    (startFrame: number, endFrame: number) => {
      if (animRef.current == null) return;

      if (endFrame < startFrame) {
        return;
      }

      setFrameRange([startFrame, endFrame]);
      animRef.current.frameRange = [startFrame, endFrame];
    },
    [],
  );

  const moveLayerDown = useCallback(
    (layerIndex: number) => {
      if (!stageRef.current) return;
      layerDispatch({ type: "move_layer_down", layerIndex });
      setActiveLayer(Math.min(layerIndex + 1, layers.length - 1));

      stageRef.current.moveLayerDown(layerIndex);
    },
    [setActiveLayer, layers.length],
  );

  const moveLayerUp = useCallback(
    (layerIndex: number) => {
      if (!stageRef.current) return;
      layerDispatch({ type: "move_layer_up", layerIndex });
      setActiveLayer(Math.max(layerIndex - 1, 0));
      stageRef.current.moveLayerUp(layerIndex);
    },
    [setActiveLayer],
  );

  return (
    <div id="app">
      <MenuBar items={menuModel} />

      <div className="sidebar sidebar--left">
        <Toolbar tools={toolsModel} mode={mode} setMode={setMode} />
      </div>

      <Stage
        ref={stageRef}
        animRef={animRef}
        onFrameUpdate={updateTimeline}
        onReady={onReady}
        onPlayEnd={onPlayEnd}
      />

      <div className="sidebar sidebar--right">
        {JSON.stringify(layers)}

        <div className="btn-group">
          {mode === E_Mode.BRUSH && (
            <Brushes
              brushes={brushes}
              dispatch={brushDispatch}
              activeBrush={brush}
              setBrush={(brush: Brush) => setBrush(brush)}
            />
          )}
        </div>
      </div>

      <Timeline
        isLooping={isLooping}
        playing={playing}
        frameRange={frameRange}
        currentLayer={currentLayer}
        layers={layers}
        onAddLayer={addLayer}
        onActiveLayer={setActiveLayer}
        onChangeCurrentFrame={changeCurrentFrame}
        onTogglePlay={togglePlay}
        onToggleLoop={toggleLoop}
        onToggleLock={toggleLock}
        onToggleVisible={toggleVisible}
        onChangeLayerName={changeLayerName}
        onChangeFrameRange={changeFrameRange}
        onLayerDown={moveLayerDown}
        onLayerUp={moveLayerUp}
      />

      {loading && <SplashScreen />}
    </div>
  );
}

"use client";

import MenuBar from "./components/MenuBar";
import Stage from "./components/Stage";
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
import Toolbar from "./components/Toolbar";
import ProgressBar from "./components/ProgressBar";
import {
    IconHandStop,
    IconBrush,
    IconBucketDroplet,
    IconEraser,
} from "@tabler/icons-react";
import {
    AnimObject,
    AnimRef,
    Camera,
    E_Mode,
    Layer,
    UUID,
    Vector,
} from "./lib/Anim";
import Timeline from "./components/Timeline";
import SplashScreen from "./components/SplashScreen";
import layerReducer from "./reducers/LayerReducer";

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

const createSaveFilePicker = async (fileName: string): Promise<FileSystemFileHandle> => {
    const fileHandle = await window.showSaveFilePicker({
        suggestedName: fileName,
    });

    return fileHandle;
}

export default function Home() {
    const { theme, setTheme } = useContext(ThemeContext);
    // TODO: Fix naming conventions of variables
    const [loading, setLoading] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [isLooping, setLooping] = useState(false);
    const [mode, setMode] = useState(E_Mode.BRUSH);
    const [currentLayer, setCurrentLayer] = useState(0);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [frameRange, setFrameRange] = useState([0, 23]);
    const [cachedFileHandle, setCachedFileHandle] = useState(null);
    const [metadata, setMetadata] = useState({
        width: 1920,
        height: 1080,
        fps: 24,
    });
    const stageRef = useRef(null);
    const animRef = useRef<AnimRef | null>(null);
    const [layers, dispatch] = useReducer(layerReducer, []);

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
            brush: {
                size: 5,
                color: "red",
            },
            mode: E_Mode.BRUSH,
            camera: new Camera(),
            isPlaying: false,
            isExporting: false,
            currentFrameIndex: 0,
            currentLayerIndex: 0,
            frameRange: [0, 23],
            mouse: new Vector(),
            layers: [],
            activeAnimObject: null,
            isPointerDown: false,
        };
    }

    const changeLayerName = useCallback((id: string, name: string) => {
        if (!stageRef.current) return;

        const layer = stageRef.current.getLayerById(id);

        layer.name = name;


        dispatch({ id, name, type: "change_layer_name" });
    }, []);

    const toggleLock = useCallback((id: string) => {
        if (!stageRef.current) return;

        const layer = stageRef.current.getLayerById(id);

        layer.locked = !layer.locked;

        dispatch({ id, type: "toggle_layer_lock" });
    }, []);

    const toggleVisible = useCallback((id: string) => {
        if (!stageRef.current) return;


        const layer = stageRef.current.getLayerById(id);

        layer.visible = !layer.visible;

        dispatch({ id, type: "toggle_layer_visible" });
    }, []);

    const addLayer = useCallback(() => {
        const newLayer = new Layer("New Layer");

        animRef.current.layers.push(newLayer);

        dispatch({ type: "add_layer", id: newLayer.id, name: newLayer.name });
    }, []);

    function togglePlay() {
        setPlaying((playing) => !playing);
    }

    function toggleLoop() {

        setLooping((isLooping) => !isLooping);
    }

    const prevFrame = useCallback(() => {
        if (animRef.current == null) return;

        if (animRef.current.currentFrameIndex > 0) {
            animRef.current.currentFrameIndex--;
        }

        setCurrentFrame(animRef.current.currentFrameIndex);
    }, []);

    const nextFrame = useCallback(() => {
        if (animRef.current == null) return;

        if (animRef.current.currentFrameIndex < animRef.current.frameRange[1]) {
            animRef.current.currentFrameIndex++;
        }

        setCurrentFrame(animRef.current.currentFrameIndex);
    }, []);


    // https://stackblitz.com/edit/continuous-saving-file-browser?file=src%2FApp.tsx
    /**
     * saveFile
     *
     * Saves current Anim Project as file
     */
    const saveFile = useCallback(async (forceSaveAs = false) => {
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
        });

        const blob = new Blob([animJSON], { type: "text/plain" });
        const fileName = "AnimProject.anim";

        if (window.showSaveFilePicker) {
            try {
                let fileHandle: FileSystemFileHandle | undefined;

                if (cachedFileHandle && forceSaveAs == false) {
                    console.log("wdhniosndfgosbndjofbn")
                    fileHandle = cachedFileHandle;
                } else {
                    console.log("test")
                    fileHandle = await createSaveFilePicker(fileName);
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
    }, [cachedFileHandle]);

    async function openFile() {
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

        dispatch({ type: "clear_all_layers" });

        // console.log(json);

        animRef.current.layers = [];
        animRef.current.metadata = json.metadata;
        animRef.current.camera = Camera.fromJSON(json.camera);
        animRef.current.frameRange = json.frameRange;
        animRef.current.currentFrameIndex = json.currentFrameIndex;
        animRef.current.currentLayerIndex = json.currentLayerIndex;

        for (const layer of json.layers) {
            dispatch({ type: "add_layer", id: layer.id, name: layer.name });
            animRef.current.layers.push(Layer.fromJSON(layer));
        }
        console.log(animRef.current.layers);

        setCurrentLayer(json.currentLayerIndex);
        setCurrentFrame(json.currentFrameIndex);

        stageRef.current.getTimeline();

        setCachedFileHandle(fileHandle);
    }

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

                if (stageRef.current)
                stageRef.current.history.undo();

                return;
            }

            if (isModifierPressed && e.shiftKey && key === "z") {
                e.preventDefault();

                if (stageRef.current)
                stageRef.current.history.redo();

                return;
            }

            /**
             * Timeline shortcuts
             */
            if (key === "p" || key === " ") {
                togglePlay();
            }

            if (key === "arrowleft") {
                prevFrame();
            }

            if (key === "arrowright") {
                nextFrame();
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

                exportVideo();

                return;
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [nextFrame, saveFile]);

    useEffect(() => {
        addLayer();
    }, [addLayer]);


    useEffect(() => {
        if (!animRef.current) return;

        animRef.current.mode = mode;
    }, [mode]);

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
                    action: () => { },
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
                    action: openFile
                },
                {
                    label: "New",
                    action: () => {}
                },
                {
                    label: "Save",
                    action: saveFile
                },
                {
                    label: "Save File As...",
                    action: () => { saveFile(true); }
                },
            ],
        },
    ];
    const toolsModel = [
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
        setLoading(false)
    }, []);

    const onNewFrame = useCallback(() => {
        console.log(stageRef.current.getTimeline());
    }, []);

    return (
        <div id="app">
            <MenuBar items={menuModel} />

            <div className="sidebar sidebar--left">
                <Toolbar tools={toolsModel} mode={mode} setMode={setMode} />
            </div>

            <Stage ref={stageRef} animRef={animRef} onNewFrame={onNewFrame} onReady={onReady} />

            <div className="sidebar sidebar--right">{JSON.stringify(layers)} Current Layer: {currentLayer} Current Frame: {currentFrame}</div>

            <Timeline
                isLooping={isLooping}
                playing={playing}
                frameRange={frameRange}
                currentFrame={currentFrame}
                currentLayer={currentLayer}
                layers={layers}
                onAddLayer={addLayer}
                onActiveLayer={(newLayerIndex: number) => setCurrentLayer(newLayerIndex)}
                onTogglePlay={togglePlay}
                onToggleLoop={toggleLoop}
                onToggleLock={toggleLock}
                onToggleVisible={toggleVisible}
                onChangeLayerName={changeLayerName}
            />

            {loading && <SplashScreen />}
        </div>
    );
}
"use client";

import { useRef, useState, useEffect, PointerEventHandler, useLayoutEffect, useContext, RefObject } from "react";
import { E_Mode, Vector, Rectangle, Camera, Layer, Frame, AnimStroke, AnimObject, AnimImage, ImageAsset } from "@/app/lib/Anim";
import { ThemeContext } from "../ThemeContext";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { transcode } from "buffer";

type ViewportProp = { onLoaded: Function };
type AnimState = {
    metadata: object,
    history: AnimObject[],
    onion: object,
    camera: Camera,
    isPlaying: boolean,
    isExporting: boolean, 
    isPointerDown: boolean,
    currentFrameIndex: number,
    currentLayerIndex: number,
    frameRange: number[],
    mouse: Vector,
    layers: Layer[],
    activeAnimObject: AnimObject|null
};

export default function Viewport({ onLoaded, layers }: ViewportProp) {
    const { theme } = useContext(ThemeContext);
    const [cachedFileHandle, setCachedFileHandle] = useState<FileSystemFileHandle | undefined>(); // https://stackblitz.com/edit/continuous-saving-file-browser?file=src%2FApp.tsx thx!
    const [isLoaded, setLoaded] = useState(false);
    const [mode, setMode] = useState(E_Mode.BRUSH);
    const ffmpegRef = useRef<FFmpeg|null>(null);
    const rawMouseRef = useRef(new Vector());
    const mouseRef = useRef(new Vector());
    const animRef = useRef<AnimState|null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const onionCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const viewportCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const onionCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const viewportCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const renderRequestRef = useRef<number | null>(null);
    const [windowSize, setWindowSize] = useState([0, 0]);
    const [dpr, setDpr] = useState(1);
    const brush = {
      stroke: "#000000",
      size: 5
    };

    if (animRef.current == null) {
        animRef.current = {
            metadata: {
                width: 1920,
                height: 1080,
                fps: 24
            },
            history: [],
            onion: {
                enabled: true,
                layers: 5
            },
            camera: new Camera(),
            isPlaying: false,
            isExporting: false,
            currentFrameIndex: 0,
            currentLayerIndex: 0,
            frameRange: [0, 23],
            mouse: new Vector(),
            layers: layers,
            activeAnimObject: null,
            isPointerDown: false
        };
    }

    /**
     * sets up canvas and ctx on several events
     */
    useEffect(() => {
        const containerRes: HTMLDivElement|null = containerRef.current;

        if (!containerRes || !(containerRes instanceof HTMLDivElement)) {
            return;
        }

        const container: HTMLDivElement = containerRes;
        const canvasRes: HTMLCanvasElement|null = canvasRef.current;

        if (!canvasRes || !(canvasRes instanceof HTMLCanvasElement)) {
            return;
        }

        const canvas: HTMLCanvasElement = canvasRes;
        const ctxRes: CanvasRenderingContext2D|null = canvas.getContext("2d");

        if (!ctxRes || !(ctxRes instanceof CanvasRenderingContext2D)) {
            console.error("ctxRes Invalid");
            return;
        }

        const ctx: CanvasRenderingContext2D = ctxRes;

        canvas.width = container.clientWidth * dpr;
        canvas.height = container.clientHeight * dpr;

        ctx.scale(dpr, dpr);

        ctxRef.current = ctx;

        if (onionCanvasRef.current == null) {
            onionCanvasRef.current = document.createElement("canvas");
        }

        if (viewportCanvasRef.current == null) {
            viewportCanvasRef.current = document.createElement("canvas");
        }

        if (animRef.current != null) {
            /**
             * Adding this block of code messes with the scaling of viewport!
             * TODO: fix
             */
            const { metadata, camera } = animRef.current;
            const scale = Math.min(container.clientWidth / metadata.width, container.clientHeight / metadata.height);
            camera.fitScale = scale;
        }

        onionCtxRef.current = onionCanvasRef.current.getContext("2d");
        viewportCtxRef.current = viewportCanvasRef.current.getContext("2d");
        
        onionCanvasRef.current.width = canvas.width;
        onionCanvasRef.current.height = canvas.height;

        viewportCanvasRef.current.width = animRef.current?.metadata.width;
        viewportCanvasRef.current.height = animRef.current?.metadata.height;
    }, [windowSize, dpr]);

    /**
     * Runs on first initialized
     */
    useLayoutEffect(() => {
        function handleResize() {
            setWindowSize([window.innerWidth, window.innerHeight ]);
        }

        async function loadFFmpeg() {
            ffmpegRef.current = new FFmpeg();

            const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
            const ffmpeg = ffmpegRef.current;
            ffmpeg.on("log", ({ message }) => {
                console.log(message);
                // if (messageRef.current) messageRef.current.innerHTML = message;
            });
            // toBlobURL is used to bypass CORS issue, urls with the same
            // domain can be used directly.
            await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(
                `${baseURL}/ffmpeg-core.wasm`,
                "application/wasm"
            ),
            });
        };

        async function onLoad() {
            setWindowSize([window.innerWidth, window.innerHeight ]);
            setDpr(window.devicePixelRatio);
            await loadFFmpeg();
            setLoaded(true);
            onLoaded();


            // setTimeout(() => {
            // }, 5000);
        }

        window.addEventListener("resize", handleResize);

        onLoad();

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [onLoaded]);

    function getCurrentLayer() {
        const { layers, currentLayerIndex } = animRef.current;

        return layers[currentLayerIndex];
    }

    function getPreviousFrames(layer: Layer = getCurrentLayer()) {
        const { onion, currentFrameIndex } = animRef.current;
        const frames: Frame[] = [];
        let frameIndex = layer.getActualFrameIndexOfFrame(currentFrameIndex) - 1;

        if (frameIndex == -1) return frames;

        for (let i = 0; i < onion.layers; i++) {
            if (frameIndex < 0) break;

            frames.push(layer.frames[frameIndex]);
            frameIndex--;
        }

        return frames;
    }

    function getCurrentFrame(layer: Layer = getCurrentLayer()) {
        const { currentFrameIndex } = animRef.current;
        const frame = layer.getFrame(currentFrameIndex);
        return frame;
    }

    function getNextFrames(layer: Layer = getCurrentLayer()) {
        const { onion, currentFrameIndex } = animRef.current;
        const frames: Frame[] = [];
        let frameIndex = layer.getActualFrameIndexOfFrame(currentFrameIndex) + 1;

        if (frameIndex == -1) return frames;

        for (let i = 0; i < onion.layers; i++) {
            if (frameIndex > layer.frames.length || layer.frames[frameIndex] == undefined) break;

            frames.push(layer.frames[frameIndex]);
            frameIndex++;
        }

        return frames;
    }

    function renderOnion(frame, color, opacity) {
        const canvas2 = onionCanvasRef.current;
        const ctx2 = onionCtxRef.current;
        const ctx = ctxRef.current;
        const { camera } = animRef.current;

        if (frame == null || canvas2 == null || ctx == null || ctx2 == null || camera == null) return;

        ctx2.clearRect(0, 0, canvas2.width, canvas2.height);

        ctx2.save();

        ctx2.scale(dpr, dpr);
        ctx2.scale(camera.scale, camera.scale);
        ctx2.translate(camera.x, camera.y);

        for (const animObject of frame.animObjects) {
            animObject._render(ctx2);
        }

        ctx2.restore();

        ctx2.save();

        ctx2.globalCompositeOperation = "source-in";
        ctx2.fillStyle = color;
        ctx2.fillRect(0, 0, canvas2.width, canvas2.height);

        ctx2.restore();

        ctx.save();

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = opacity;
        ctx.drawImage(canvas2, 0, 0);

        ctx.restore();
    }

    function renderScene(ctx: CanvasRenderingContext2D) {
        const { camera } = animRef.current;

        ctx.save();

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, animRef.current.metadata.width, animRef.current.metadata.height);

        const { isPlaying, layers } = animRef.current;

        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            const previousFrames = isPlaying ? [] : getPreviousFrames(layer);
            const frame = getCurrentFrame(layer);
            const nextFrames = isPlaying ? [] : getNextFrames(layer);

            if (frame == null) {
                console.log("No frame to render.");
                continue;
            }

            for (let i = 0; i < previousFrames.length; i++) {
                const frame = previousFrames[i];
                const opacity = 0.5 * (1 - (i / previousFrames.length));

                renderOnion(frame, "red", opacity);
            }

            for (let i = 0; i < nextFrames.length; i++) {
                let frame = nextFrames[i];
                let opacity = 0.5 * (1 - (i / nextFrames.length));

                renderOnion(frame, "green", opacity);
            }

            for (const animObject of frame.animObjects) {
                animObject._render(ctx);
            }
        }

        ctx.restore();
    }

    const transcode = async () => {
        const ffmpeg = ffmpegRef.current;
        // u can use 'https://ffmpegwasm.netlify.app/video/video-15s.avi' to download the video to public folder for testing
        await ffmpeg.writeFile(
        "input.avi",
        await fetchFile(
            "https://raw.githubusercontent.com/ffmpegwasm/testdata/master/video-15s.avi"
        )
        );
        await ffmpeg.exec(["-i", "input.avi", "output.mp4"]);
        const data = (await ffmpeg.readFile("output.mp4")) as any;
        // if (videoRef.current)
        // videoRef.current.src = URL.createObjectURL(
        //     new Blob([data.buffer], { type: "video/mp4" })
        // );

        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);

        // Create a link to download the video
        const a = document.createElement('a');
        a.href = url;
        a.download = 'recording.mp4';
        a.click();
    };

    useEffect(() => {
        if (!isLoaded) return;

        console.log(containerRef.current?.clientHeight)

        let lastFrameTimestamp = performance.now();
                
        function handleRender() {
            const canvasRes: HTMLCanvasElement|null = canvasRef.current;
            const ctxRes: CanvasRenderingContext2D|null = ctxRef.current;

            if ((!ctxRes || !(ctxRes instanceof CanvasRenderingContext2D)) || (!canvasRes || !(canvasRes instanceof HTMLCanvasElement))) {
                return;
            }

            const { metadata, camera, isPlaying, currentFrameIndex, frameRange } = animRef.current;
            const canvas: HTMLCanvasElement = canvasRes;
            const ctx: CanvasRenderingContext2D = ctxRes;

            mouseRef.current.x = (rawMouseRef.current.x / camera.scale) - camera.x;
            mouseRef.current.y = (rawMouseRef.current.y / camera.scale) - camera.y;

            if (isPlaying) {
                const currentFrameTimestamp = performance.now();

                if (currentFrameTimestamp - lastFrameTimestamp > (1000 / animRef.current.metadata.fps)) {
                    lastFrameTimestamp = currentFrameTimestamp;
                    animRef.current.currentFrameIndex++;
                }

                if (currentFrameIndex > frameRange[1]) {
                    animRef.current.currentFrameIndex = frameRange[0];
                }
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.save();

            ctx.scale(camera.scale, camera.scale);
            ctx.translate(camera.x, camera.y);

            ctx.strokeStyle = (theme === "light") ? "#00000099" : "#757575";
            ctx.lineWidth = 3 / camera.scale; // Keeps the line visible regardless of zoom
            ctx.strokeRect(0, 0, animRef.current.metadata.width, animRef.current.metadata.height);

            // Render canvas... canvas?
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, animRef.current.metadata.width, animRef.current.metadata.height);

            renderScene(ctx);

            ctx.beginPath();
            ctx.arc(mouseRef.current.x, mouseRef.current.y, brush.size / 2, 0, 2 * Math.PI);
            ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
            ctx.fill();

            ctx.restore();

            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillText(`Camera: {x: ${Math.round(camera.x)}, y: ${Math.round(camera.y)}, scale: ${camera.scale}}`, 6, 18);
            ctx.fillText(`Frame: {current: ${currentFrameIndex}, startFrame: ${frameRange[0]}, endFrame: ${frameRange[1]}`, 6, 30);

            if (camera.scale > camera.fitScale) {
                renderScene(viewportCtxRef.current, true);

                ctx.save();

                const margin = 40;
                const scale = 0.25;
                const minified = {
                    width: metadata.width * scale,
                    height: metadata.height * scale
                };
                const rect = new Rectangle(
                    canvas.width - minified.width - margin,
                    canvas.height - minified.height - margin,
                    minified.width,
                    minified.height
                );
                const canvasRect = new Rectangle(
                    rect.x - camera.x * scale,
                    rect.y - camera.y * scale,
                    canvas.width / 2 * scale / camera.scale,
                    canvas.height / 2 * scale / camera.scale
                );

                ctx.scale(1 / dpr, 1 / dpr);
                ctx.drawImage(viewportCanvasRef.current, rect.x, rect.y, rect.w, rect.h);
                ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

                ctx.strokeStyle = "rgba(0,0,0,0.5)";
                ctx.strokeRect(canvasRect.x, canvasRect.y, canvasRect.w, canvasRect.h);

                ctx.fillStyle = "rgba(0,0,0,0.25)";
                ctx.fillRect(canvasRect.x, canvasRect.y, canvasRect.w, canvasRect.h);

                ctx.restore();
            }

            renderRequestRef.current = requestAnimationFrame(handleRender);
        }

        renderRequestRef.current = requestAnimationFrame(handleRender);

        return () => {
            if (renderRequestRef.current) cancelAnimationFrame(renderRequestRef.current);
        }
    }, [isLoaded, dpr, brush.size, theme]);

    // function centerCamera() {
        // const scale = Math.min(container.clientWidth / animRef.current.metadata.width, container.clientHeight / animRef.current.metadata.height);
        // camera.scale = scale;
        // camera.x = (container.clientWidth - animRef.current.metadata.width * scale) / 2;
        // camera.y = (container.clientHeight - animRef.current.metadata.height * scale) / 2;
    // }
    
    /**
     * saveFile
     * 
     * Saves current Anim Project as file
     */
    async function saveFile(forceSaveAs?: boolean) {
        if (typeof window === "undefined") {
            return;
        }

        const animJSON = JSON.stringify({
            version: 1.1,
            metadata: animRef.current.metadata,
            camera: animRef.current.camera,
            layers: animRef.current.layers,
            frameRange: animRef.current.frameRange,
            currentFrameIndex: animRef.current.currentFrameIndex,
            currentLayerIndex: animRef.current.currentLayerIndex
        });

        const blob = new Blob([animJSON], { type: 'text/plain' });
        const fileName = 'AnimProject.anim';

        if (window.showSaveFilePicker) {
            try {
                let fileHandle: FileSystemFileHandle | undefined;

                if (cachedFileHandle && !forceSaveAs) {
                    fileHandle = cachedFileHandle;
                } else {
                    fileHandle = await createSaveFilePicker(fileName);
                    setCachedFileHandle(fileHandle);
                }

                console.log(fileHandle);

                const writable = await fileHandle.createWritable();
                
                await writable.write(blob);
                await writable.close();
            } catch (error) {
                console.error('Error selecting a file:', error);
                return null;
            }
        }
        else
        {
            const a = document.createElement('a');
            a.href = window.URL.createObjectURL(blob);
            a.download = fileName;

            // Trigger the download
            a.click();

            // Clean up
            window.URL.revokeObjectURL(a.href);
        }
    }

    async function openFile() {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'anim',
                accept: { 'application/json': ['.anim'] },
            }],
        });

        const file = await fileHandle.getFile();
        const json = JSON.parse(await file.text());

        // console.log(json);

        animRef.current.layers = [];
        animRef.current.metadata = json.metadata;
        animRef.current.camera = Camera.fromJSON(json.camera);
        animRef.current.frameRange = json.frameRange;
        animRef.current.currentFrameIndex = json.currentFrameIndex;
        animRef.current.currentLayerIndex = json.currentLayerIndex;

        for (const layer of json.layers) {
            animRef.current.layers.push(Layer.fromJSON(layer));
        }

        setCachedFileHandle(fileHandle);
    }

    function handleMouseMove(e: MouseEvent) {
        const canvasRes: HTMLCanvasElement|null = canvasRef.current;

        if (!canvasRes || !(canvasRes instanceof HTMLCanvasElement)) {
            return;
        }

        const canvas: HTMLCanvasElement = canvasRes;
        const { x, y } = canvas.getBoundingClientRect();

        rawMouseRef.current = new Vector(e.clientX - x, e.clientY - y);
    }

    function handlePointerDown(e: PointerEvent) {
        handleMouseMove(e);
        // console.log(e);

        let frame = getCurrentFrame();
        const layer = getCurrentLayer();

        if (!frame) return;

        animRef.current.isPointerDown = true;

        const { currentFrameIndex } = animRef.current;
        const { x, y } = mouseRef.current;

        switch (mode) {
            case E_Mode.HAND:
                for (const animObject of frame.animObjects) {
                    animObject.selected = true;

                    animRef.current.activeAnimObject = animObject;
                }

                break;
            case E_Mode.BRUSH:
                if (frame.index != currentFrameIndex) {
                    frame = new Frame(currentFrameIndex);
                    layer.addFrame(frame);
                }

                let newAnimObject = new AnimStroke({ brush });
                let point = { x, y, pressure: e.pressure || 1 };

                newAnimObject.points = [point];
                frame.animObjects.push(newAnimObject);

                animRef.current.activeAnimObject = newAnimObject;
                break;
            case E_Mode.BUCKET:
                break;
            case E_Mode.ERASER:
                console.log("test");
                for (const animObject of frame.animObjects) {
                    if (animObject instanceof AnimStroke) {
                        animObject.points.map((point) => {
                            if (Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2) < animObject.brush.size + brush.size) {
                                point.deleted = true;
                            }
                        });
                    }
                }
                break;
            default:
                console.error(`${mode} is not a valid mode.`);
        }
    }

    function handlePointerMove(e: PointerEvent) {
        handleMouseMove(e);

        const { activeAnimObject, isPointerDown } = animRef.current;
        const { x, y } = mouseRef.current;        

        if (!isPointerDown) return;

        switch (mode) {
            case E_Mode.HAND:
                break;
            case E_Mode.BRUSH:
                if (!activeAnimObject || !(activeAnimObject instanceof AnimObject)) return;

                if (e.buttons !== 1) return;
                const point = { x, y, pressure: e.pointerType === "pen" ? e.pressure : 1 };

                activeAnimObject.points.push(point);
                break;
            case E_Mode.BUCKET:
                break;
            case E_Mode.ERASER:
                const frame = getCurrentFrame();

                    console.log("sdfsdf");


                for (const animObject of frame.animObjects) {
                    if (animObject instanceof AnimStroke) {
                        animObject.points.map((point) => {
                            if (Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2) < animObject.brush.size + brush.size) {
                                point.deleted = true;
                            }
                        });
                    }
                }
                break;
            default:
                console.error(`${mode} is not a valid mode.`);
        }
    }

    function handlePointerUp(e: PointerEvent) {
        handleMouseMove(e);

        animRef.current.isPointerDown = false;

        switch (mode) {
            case E_Mode.HAND:
                break;
            case E_Mode.BRUSH:
                animRef.current.activeAnimObject = null;
                break;
            case E_Mode.BUCKET:
                break;
            case E_Mode.ERASER:
                break;
            default:
                console.error(`${mode} is not a valid mode.`);
        }
    }

    function handleContextMenu(e: MouseEvent) {
        e.preventDefault();
    }

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
        const isModifierPressed = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();

        // Undo
        if (isModifierPressed && !e.shiftKey && key === "z") {
            e.preventDefault();

            const frame = getCurrentFrame();
            const popped = frame?.animObjects.pop();

            // console.log(frame.items);

            if (popped) {
                animRef.current.history.push({ frame: frame, animObject: popped });
            }

            return;
        }

        // Redo
        if (isModifierPressed && e.shiftKey && key === "z") {
            e.preventDefault();

            const popped = animRef.current.history.pop();

            console.log(popped);

            if (popped) {
                const frame = getCurrentFrame();

                if (frame) {
                    console.log(frame);
                    popped.frame.animObjects.push(popped.animObject);
                }
            }

            return;
        }

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


        // Zoom out
        if (isModifierPressed && key === "-") {
            e.preventDefault();

            animRef.current.camera.scale = Math.max(
                animRef.current.camera.minScale,
                animRef.current.camera.scale - 0.01
            );

            return;
        }

        // Zoom in
        if (isModifierPressed && (key === "=" || key === "+")) {
            e.preventDefault();

            console.log("Zoom in");

            animRef.current.camera.scale = Math.min(
                animRef.current.camera.maxScale,
                animRef.current.camera.scale + 0.01
            );

            return;
        }

        if (isModifierPressed && (key === "e")) {
            e.preventDefault();

            console.log("Exporting...");

            exportVideo();

            return;
        }

        // // Previous frame
        if (key === "arrowleft" && animRef.current.currentFrameIndex > 0) {
            animRef.current.currentFrameIndex--;
            return;
        }

        // // Next frame
        if (key === "arrowright") {
            animRef.current.currentFrameIndex++;
        }

        if (key === "p" || key === " ") {
            animRef.current.isPlaying = !animRef.current.isPlaying ;
        }
    }

        document.addEventListener("keydown", handleKeyDown);
        
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        }

    }, [cachedFileHandle]);

    /**
     * Wheel Effect
     */
    useEffect(() => {
        // I hate react sometimes...
        function handleWheel(e: WheelEvent) {
            e.preventDefault();

            const { camera } = animRef.current;

            // On trackpads, pinch-to-zoom triggers wheel events with the ctrlKey set to true
            if (e.ctrlKey) {
                // Zooming
                const zoomSensitivity = 0.01;
                const delta = -e.deltaY * zoomSensitivity;

                // apply zoom limits
                camera.scale = Math.min(Math.max(camera.minScale, camera.scale + delta), camera.maxScale);
            } else {
                // Panning (two-finger swipe on trackpad or mouse wheel scroll)
                camera.x -= e.deltaX / camera.scale;
                camera.y -= e.deltaY / camera.scale;
            }
        }

        canvasRef.current?.addEventListener("wheel", handleWheel, { passive: false });

        return () => { if (canvasRef.current && canvasRef.current instanceof HTMLCanvasElement) canvasRef.current.removeEventListener("wheel", handleWheel); }
    }, []);

    function handleDragOver(e) {
        e.preventDefault();
        handleMouseMove(e);
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        console.log("Dragover event");
    }

   async function handleDrop(e) {
      e.preventDefault();
      console.log("Drop event");
      console.log(e);

      /**
       * TODO: Set up image, text drop
       */

      const dt = e.dataTransfer;
      const types = dt.types;
      const type = types[0];
      const frame = getCurrentFrame();


      if (type === "text/uri-list") {
         const url = dt.getData(type);

         try {
            const imageAsset = await ImageAsset.fromImageURL(url);
            console.log(imageAsset);

            const drawImage = new AnimImage({ pos: new Vector(mouseRef.current.x, mouseRef.current.y), imageAsset });

            frame?.animObjects.push(drawImage);
         } catch (error) {
            console.error("Could not add Image...");
            console.error(error);
         }
      } else if (type === "files") {
         console.log("Handle file");
      }

      console.log(types);
   }
    
    return <div className="viewport" ref={containerRef}>
        <canvas ref={canvasRef} onDrop={handleDrop} onDragOver={handleDragOver} onContextMenu={handleContextMenu} onPointerMove={handlePointerMove} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}></canvas>
    </div>;
}

const createSaveFilePicker = async (fileName: string): Promise<FileSystemFileHandle> => {
    const fileHandle = await window.showSaveFilePicker({
        suggestedName: fileName,
    });

    return fileHandle;
}

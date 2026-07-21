import {
  memo,
  forwardRef,
  RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Frame,
  AnimStroke,
  E_Mode,
  Rectangle,
  ImageAsset,
  AnimImage,
  Vector,
  AnimRef,
  Camera,
  Layer,
  AnimImageProps,
  AnimStrokeProps,
} from "../lib/Anim";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { transcode } from "buffer";

type StageProps = {
  animRef: RefObject<AnimRef | null>;
  onReady: () => void;
  onFrameUpdate: () => void;
  onPlayEnd: () => void;
};

// Source - https://stackoverflow.com/a/5306832
// Posted by user236139, modified by community. See post 'Timeline' for change history
// Retrieved 2026-07-19, License - CC BY-SA 3.0

function array_move(arr: Array<unknown>, old_index: number, new_index: number) {
    if (new_index >= arr.length) {
        let k = new_index - arr.length + 1;
        while (k--) {
            arr.push(undefined);
        }
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    return arr; // for testing
};

const Stage = memo(
  forwardRef(
    ({ animRef, onReady, onFrameUpdate, onPlayEnd }: StageProps, ref) => {
      const cameraRef = useRef<Camera>(new Camera());
      const containerRef = useRef<HTMLDivElement | null>(null);
      const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
      const onionCanvasRef = useRef<HTMLCanvasElement | null>(null);
      const viewportCanvasRef = useRef<HTMLCanvasElement | null>(null);
      const stageCtxRef = useRef<CanvasRenderingContext2D | null>(null);
      const onionCtxRef = useRef<CanvasRenderingContext2D | null>(null);
      const viewportCtxRef = useRef<CanvasRenderingContext2D | null>(null);
      const ffmpegRef = useRef<FFmpeg | null>(null);
      const renderRequestRef = useRef<number | null>(null);
      const rawMouseRef = useRef(new Vector());
      const mouseRef = useRef(new Vector());
      const [windowSize, setWindowSize] = useState([0, 0]);
      const [dpr, setDpr] = useState(1);

      const getCurrentLayer = useCallback(() => {
        if (!animRef.current) return null;
        const { layers, currentLayerIndex } = animRef.current;
        return layers[currentLayerIndex];
      }, [animRef]);

      const getCurrentFrame = useCallback(
        (layer: Layer | null = getCurrentLayer()) => {
          if (!layer || !animRef.current) return null;
          const { currentFrameIndex } = animRef.current;
          return layer.getFrame(currentFrameIndex);
        },
        [animRef, getCurrentLayer],
      );

      const setCurrentFrame = useCallback(
        (nextFrame: number) => {
          if (animRef.current == null) return;
          animRef.current.currentFrameIndex = nextFrame;

          if (animRef.current.currentFrameIndex < 0)
            animRef.current.currentFrameIndex = 0;

          // Dispatch event so that player tick updates without rerendering
          const event = new CustomEvent("anim-frame-update", {
            detail: animRef.current.currentFrameIndex,
          });
          window.dispatchEvent(event);
        },
        [animRef],
      );

      const getPreviousFrames = useCallback(
        (layer: Layer | null = getCurrentLayer()) => {
          if (!layer || !animRef.current) return [];
          const { onion, currentFrameIndex } = animRef.current;
          const frames: Frame[] = [];
          let frameIndex =
            layer.getActualFrameIndexOfFrame(currentFrameIndex) - 1;

          if (frameIndex === -1) return frames;

          for (let i = 0; i < onion.layers; i++) {
            if (frameIndex < 0) break;
            frames.push(layer.frames[frameIndex]);
            frameIndex--;
          }

          return frames;
        },
        [animRef, getCurrentLayer],
      );

      const getNextFrames = useCallback(
        (layer: Layer | null = getCurrentLayer()) => {
          if (!layer || !animRef.current) return [];
          const { onion, currentFrameIndex } = animRef.current;
          const frames: Frame[] = [];
          let frameIndex =
            layer.getActualFrameIndexOfFrame(currentFrameIndex) + 1;

          if (frameIndex === -1) return frames;

          for (let i = 0; i < onion.layers; i++) {
            if (
              frameIndex >= layer.frames.length ||
              layer.frames[frameIndex] === undefined
            )
              break;
            frames.push(layer.frames[frameIndex]);
            frameIndex++;
          }

          return frames;
        },
        [animRef, getCurrentLayer],
      );

      const renderOnion = useCallback(
        (frame: Frame | null, color: string, opacity: number) => {
          const canvas2 = onionCanvasRef.current;
          const ctx2 = onionCtxRef.current;
          const ctx = stageCtxRef.current; // Fixed: was ctxRef.current

          if (!frame || !canvas2 || !ctx || !ctx2 || !animRef.current) return;

          const camera = cameraRef.current;

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
        },
        [animRef, dpr],
      );

      const renderScene = useCallback(
        (ctx: CanvasRenderingContext2D | null, isViewport: boolean = false) => {
          if (!ctx || !animRef.current) return;

          const { isPlaying, layers } = animRef.current;

          ctx.save();
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(
            0,
            0,
            animRef.current.metadata.width,
            animRef.current.metadata.height,
          );

          for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];

            // Prevent rendering
            if (!layer.visible) {
              continue;
            }

            const previousFrames = isPlaying ? [] : getPreviousFrames(layer);
            const frame = getCurrentFrame(layer);
            const nextFrames = isPlaying ? [] : getNextFrames(layer);

            if (frame == null) {
              console.log("No frame to render.");
              continue;
            }

            for (let j = 0; j < previousFrames.length; j++) {
              if (isViewport) break;
              const prevFrame = previousFrames[j];
              const opacity = 0.5 * (1 - j / previousFrames.length);
              renderOnion(prevFrame, "red", opacity);
            }

            for (let j = 0; j < nextFrames.length; j++) {
              if (isViewport) break;
              const nextFrame = nextFrames[j];
              const opacity = 0.5 * (1 - j / nextFrames.length);
              renderOnion(nextFrame, "green", opacity);
            }

            for (const animObject of frame.animObjects) {
              animObject._render(ctx);
            }
          }

          ctx.restore();
        },
        [
          animRef,
          getCurrentFrame,
          getNextFrames,
          getPreviousFrames,
          renderOnion,
        ],
      );

      /**
       * Runs on first initialized
       */
      useEffect(() => {
        console.log("Effect => Canvas init");

        function handleResize() {
          setWindowSize([window.innerWidth, window.innerHeight]);
        }

        async function loadFFmpeg() {
          ffmpegRef.current = new FFmpeg();

          const baseURL =
            "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
          const ffmpeg = ffmpegRef.current;
          ffmpeg.on("log", ({ message }) => {
            console.log(message);
            // if (messageRef.current) messageRef.current.innerHTML = message;
          });
          // toBlobURL is used to bypass CORS issue, urls with the same
          // domain can be used directly.
          await ffmpeg.load({
            coreURL: await toBlobURL(
              `${baseURL}/ffmpeg-core.js`,
              "text/javascript",
            ),
            wasmURL: await toBlobURL(
              `${baseURL}/ffmpeg-core.wasm`,
              "application/wasm",
            ),
          });
        }

        // async function fakeLoader(ms: number) {
        //   return new Promise((resolve) => {
        //     setTimeout(resolve, ms);
        //   });
        // }

        async function onLoad() {
          setWindowSize([window.innerWidth, window.innerHeight]);
          setDpr(window.devicePixelRatio || 1);
          await loadFFmpeg();
          // await fakeLoader(200);
          onReady();
        }

        onLoad();

        window.addEventListener("resize", handleResize);

        return () => {
          window.removeEventListener("resize", handleResize);
        };
      }, [onReady]);

      /**
       * Canvas initialization
       */
      useLayoutEffect(() => {
        console.log("Effect => Canvas change");

        if (
          !containerRef.current ||
          !(containerRef.current instanceof HTMLDivElement)
        )
          return;
        if (
          !stageCanvasRef.current ||
          !(stageCanvasRef.current instanceof HTMLCanvasElement)
        )
          return;
        if (animRef.current == null) return;

        // Create canvases if not already...
        if (onionCanvasRef.current == null) {
          onionCanvasRef.current = document.createElement("canvas");
        }
        if (viewportCanvasRef.current == null) {
          viewportCanvasRef.current = document.createElement("canvas");
        }

        const { metadata } = animRef.current;
        const container: HTMLDivElement = containerRef.current;
        const canvas: HTMLCanvasElement = stageCanvasRef.current;
        const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");

        if (!ctx) return;

        const camera = cameraRef.current;
        const scale = Math.min(
          container.clientWidth / metadata.width,
          container.clientHeight / metadata.height,
        );

        camera.fitScale = scale;

        canvas.width = container.clientWidth * dpr;
        canvas.height = container.clientHeight * dpr;

        ctx.scale(dpr, dpr);
        stageCtxRef.current = ctx;

        onionCtxRef.current = onionCanvasRef.current.getContext("2d");
        viewportCtxRef.current = viewportCanvasRef.current.getContext("2d");

        onionCanvasRef.current.width = canvas.width;
        onionCanvasRef.current.height = canvas.height;

        viewportCanvasRef.current.width = metadata.width;
        viewportCanvasRef.current.height = metadata.height;
      }, [windowSize, dpr, animRef]);

      /**
       * Canvas Loop
       */
      useEffect(() => {
        let prevTime = performance.now();

        function renderStage() {
          if (
            !stageCtxRef.current ||
            !stageCanvasRef.current ||
            !viewportCanvasRef.current ||
            !animRef.current
          )
            return;

          const { brush, metadata, isPlaying, isLooping } = animRef.current;
          const stageCanvas: HTMLCanvasElement = stageCanvasRef.current;
          const stageCtx: CanvasRenderingContext2D = stageCtxRef.current;
          const camera = cameraRef.current;
          const currentTime = performance.now();

          if (isPlaying && currentTime - prevTime > 1000 / metadata.fps) {
            if (
              animRef.current.currentFrameIndex < animRef.current.frameRange[0]
            ) {
              animRef.current.currentFrameIndex = animRef.current.frameRange[0];
            } else if (
              animRef.current.currentFrameIndex < animRef.current.frameRange[1]
            ) {
              animRef.current.currentFrameIndex++;
            } else if (isLooping) {
              animRef.current.currentFrameIndex = animRef.current.frameRange[0];
            } else {
              onPlayEnd();
              animRef.current.isPlaying = false;
            }

            // Dispatch event so that player tick updates without rerendering
            const event = new CustomEvent("anim-frame-update", {
              detail: animRef.current.currentFrameIndex,
            });
            window.dispatchEvent(event);

            prevTime = currentTime;
          }

          mouseRef.current.x = rawMouseRef.current.x / camera.scale - camera.x;
          mouseRef.current.y = rawMouseRef.current.y / camera.scale - camera.y;

          stageCtx.clearRect(0, 0, stageCanvas.width, stageCanvas.height);
          stageCtx.save();

          stageCtx.scale(camera.scale, camera.scale);
          stageCtx.translate(camera.x, camera.y);

          stageCtx.fillStyle = "#ffffff";
          stageCtx.fillRect(0, 0, metadata.width, metadata.height);

          renderScene(stageCtx);

          stageCtx.beginPath();
          stageCtx.arc(
            mouseRef.current.x,
            mouseRef.current.y,
            brush.size / 2,
            0,
            2 * Math.PI,
          );
          stageCtx.lineCap = brush.lineCap as CanvasLineCap;
          stageCtx.lineJoin = brush.lineCap as CanvasLineJoin;
          stageCtx.fillStyle = brush.color;
          stageCtx.fill();

          stageCtx.restore();

          stageCtx.fillStyle = "rgba(0,0,0,0.35)";
          stageCtx.fillText(
            `Camera: {x: ${Math.round(camera.x)}, y: ${Math.round(camera.y)}, scale: ${camera.scale}}`,
            6,
            18,
          );
          stageCtx.fillText(
            `Frame: {current: ${animRef.current.currentFrameIndex}, startFrame: ${animRef.current.frameRange[0]}, endFrame: ${animRef.current.frameRange[1]}`,
            6,
            30,
          );

          if (camera.scale > camera.fitScale) {
            renderScene(viewportCtxRef.current, true);

            stageCtx.save();

            const margin = 40;
            const scale = 0.45;
            const minified = {
              width: metadata.width * scale,
              height: metadata.height * scale,
            };
            const rect = new Rectangle(
              stageCanvas.width - minified.width - margin,
              stageCanvas.height - minified.height - margin,
              minified.width,
              minified.height,
            );
            const canvasRect = new Rectangle(
              rect.x - camera.x * scale,
              rect.y - camera.y * scale,
              ((stageCanvas.width / 2) * scale) / camera.scale,
              ((stageCanvas.height / 2) * scale) / camera.scale,
            );

            stageCtx.scale(1 / dpr, 1 / dpr);
            stageCtx.drawImage(
              viewportCanvasRef.current,
              rect.x,
              rect.y,
              rect.w,
              rect.h,
            );
            stageCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);

            stageCtx.strokeStyle = "rgba(0,0,0,0.5)";
            stageCtx.strokeRect(
              canvasRect.x,
              canvasRect.y,
              canvasRect.w,
              canvasRect.h,
            );

            stageCtx.fillStyle = "rgba(0,0,0,0.25)";
            stageCtx.fillRect(
              canvasRect.x,
              canvasRect.y,
              canvasRect.w,
              canvasRect.h,
            );

            stageCtx.restore();
          }

          renderRequestRef.current = requestAnimationFrame(renderStage);
        }

        renderRequestRef.current = requestAnimationFrame(renderStage);

        return () => {
          if (renderRequestRef.current)
            cancelAnimationFrame(renderRequestRef.current);
        };
      }, [
        animRef,
        dpr,
        getCurrentFrame,
        getPreviousFrames,
        getNextFrames,
        renderOnion,
        renderScene,
        onPlayEnd,
      ]);

      /**
       * Wheel Effect
       */
      useEffect(() => {
        if (!stageCanvasRef.current) return;
        const stageCanvas: HTMLCanvasElement = stageCanvasRef.current;

        function handleWheel(e: WheelEvent) {
          e.preventDefault();
          const camera = cameraRef.current;

          if (e.ctrlKey) {
            const zoomSensitivity = 0.01;
            const delta = -e.deltaY * zoomSensitivity;
            camera.scale = Math.min(
              Math.max(camera.minScale, camera.scale + delta),
              camera.maxScale,
            );
          } else {
            camera.x -= e.deltaX / camera.scale;
            camera.y -= e.deltaY / camera.scale;
          }
        }

        stageCanvas.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
          if (stageCanvas && stageCanvas instanceof HTMLCanvasElement) {
            stageCanvas.removeEventListener("wheel", handleWheel);
          }
        };
      }, []);

      async function handleDrop(e: React.DragEvent<HTMLCanvasElement>) {
        e.preventDefault();
        console.log("Drop event", e);

        const dt = e.dataTransfer;
        const types = dt.types;
        const type = types[0];
        const frame = getCurrentFrame();

        if (type === "text/uri-list") {
          const url = dt.getData(type);
          try {
            const imageAsset = await ImageAsset.fromImageURL(url);
            const drawImage = new AnimImage({
              pos: new Vector(mouseRef.current.x, mouseRef.current.y),
              imageAsset,
            } as AnimImageProps);
            frame?.animObjects.push(drawImage);
          } catch (error) {
            console.error("Could not add Image...", error);
          }
        } else if (type === "files") {
          console.log("Handle file");
        }
      }

      function handleMouseMove(
        e:
          | React.MouseEvent<HTMLCanvasElement>
          | React.DragEvent<HTMLCanvasElement>,
      ) {
        const stageCanvasRes: HTMLCanvasElement | null = stageCanvasRef.current;

        if (!stageCanvasRes || !(stageCanvasRes instanceof HTMLCanvasElement)) {
          return;
        }

        const { x, y } = stageCanvasRes.getBoundingClientRect();
        rawMouseRef.current = new Vector(e.clientX - x, e.clientY - y);
      }

      function handleDragOver(e: React.DragEvent<HTMLCanvasElement>) {
        e.preventDefault();
        handleMouseMove(e);
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
      }

      function handleContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
        e.preventDefault();
      }

      function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
        handleMouseMove(e);

        if (!animRef.current) return;

        let frame = getCurrentFrame();
        const layer = getCurrentLayer();

        if (!frame || !layer) return;
        if (layer.locked) return;

        animRef.current.isPointerDown = true;
        const { currentFrameIndex } = animRef.current;
        const { x, y } = mouseRef.current;

        switch (animRef.current.mode) {
          case E_Mode.HAND:
            for (const animObject of frame.animObjects) {
              animObject.selected = true;
              animRef.current.activeAnimObject = animObject;
            }
            break;
          case E_Mode.BRUSH:
            if (frame.index !== currentFrameIndex) {
              frame = new Frame(currentFrameIndex);
              layer.addFrame(frame);
              onFrameUpdate();
            }

            const newAnimObject = new AnimStroke({
              brush: animRef.current.brush,
            } as AnimStrokeProps);
            const point = { x, y, pressure: e.pressure || 1 };

            newAnimObject.points = [point];
            frame.animObjects.push(newAnimObject);
            animRef.current.activeAnimObject = newAnimObject;
            break;
          case E_Mode.BUCKET:
            break;
          case E_Mode.ERASER:
            for (const animObject of frame.animObjects) {
              if (animObject instanceof AnimStroke) {
                // Fixed: brush.size was undefined, changed to animRef.current.brush.size and mapped to forEach
                animObject.points.forEach((point) => {
                  if (
                    Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2) <
                    animObject.brush.size + animRef.current!.brush.size
                  ) {
                    point.deleted = true;
                  }
                });
              }
            }
            break;
          default:
            console.error(`${animRef.current.mode} is not a valid mode.`);
        }
      }

      function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
        handleMouseMove(e);

        if (!animRef.current || !stageCanvasRef.current) return;

        const { activeAnimObject, isPointerDown } = animRef.current;
        const { x, y } = mouseRef.current;

        if (!isPointerDown) return;

        // console.log("pointer move");
        // console.log(e);

        switch (animRef.current.mode) {
          case E_Mode.HAND:
            stageCanvasRef.current.style.cursor = "grabbing";

            cameraRef.current.x += e.movementX / cameraRef.current.scale;
            cameraRef.current.y += e.movementY / cameraRef.current.scale;

            break;
          case E_Mode.BRUSH:
            stageCanvasRef.current.style.cursor = "default";

            // Fixed: Ensures the object is an AnimStroke to safely access .points
            if (!activeAnimObject || !(activeAnimObject instanceof AnimStroke))
              return;
            if (e.buttons !== 1) return;

            const point = {
              x,
              y,
              pressure:
                e.pointerType === "pen" ? e.pressure : 1,
            };
            activeAnimObject.points.push(point);
            break;
          case E_Mode.BUCKET:
            break;
          case E_Mode.ERASER:
            const frame = getCurrentFrame();
            if (!frame) return; // Fixed: frame could be null

            for (const animObject of frame.animObjects) {
              if (animObject instanceof AnimStroke) {
                // Fixed: brush.size context and mapped to forEach
                animObject.points.forEach((point) => {
                  if (
                    Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2) <
                    animObject.brush.size + animRef.current!.brush.size
                  ) {
                    point.deleted = true;
                  }
                });
              }
            }
            break;
          default:
            console.error(`${animRef.current.mode} is not a valid mode.`);
        }
      }

      function handlePointerUp(e: React.MouseEvent<HTMLCanvasElement>) {
        handleMouseMove(e);
        if (!animRef.current || !stageCanvasRef.current) return;

        animRef.current.isPointerDown = false;

        switch (animRef.current.mode) {
          case E_Mode.HAND:
            stageCanvasRef.current.style.cursor = "grab";
          case E_Mode.BRUSH:
            animRef.current.activeAnimObject = null;
            break;
          case E_Mode.BUCKET:
          case E_Mode.ERASER:
            break;
          default:
            console.error(`${animRef.current.mode} is not a valid mode.`);
        }
      }

      // const transcode = async () => {
      //   const ffmpeg = ffmpegRef.current;
      //   // u can use 'https://ffmpegwasm.netlify.app/video/video-15s.avi' to download the video to public folder for testing

      //   if (ffmpeg === null) {
      //     console.error("Could not transcode. ffmpeg is null");
      //     return;
      //   }

      //   await ffmpeg.writeFile(
      //     "input.avi",
      //     await fetchFile(
      //       "https://raw.githubusercontent.com/ffmpegwasm/testdata/master/video-15s.avi",
      //     ),
      //   );
      //   await ffmpeg.exec(["-i", "input.avi", "output.mp4"]);
      //   const data = (await ffmpeg.readFile("output.mp4")) as any;
      //   // if (videoRef.current)
      //   // videoRef.current.src = URL.createObjectURL(
      //   //     new Blob([data.buffer], { type: "video/mp4" })
      //   // );

      //   const blob = new Blob([data.buffer], { type: "video/mp4" });
      //   const url = URL.createObjectURL(blob);

      //   // Create a link to download the video
      //   const a = document.createElement("a");
      //   a.href = url;
      //   a.download = "recording.mp4";
      //   a.click();
      // };

      useImperativeHandle(ref, () => ({
        getLayerById(id: string) {
          if (!animRef.current) return;

          const { layers } = animRef.current;
          const layer = layers.find((layer) => layer.id === id);

          console.log(layer);

          return layer;
        },
        moveLayerDown(layerIndex: number) {
          if (!animRef.current) return;

          if (layerIndex + 1 < animRef.current.layers.length)
          array_move(animRef.current.layers, layerIndex, layerIndex + 1);
        },
        moveLayerUp(layerIndex: number) {
          if (!animRef.current) return;
          if (layerIndex - 1 >= 0)
          array_move(animRef.current.layers, layerIndex, layerIndex - 1);
        },
        exportVideo() {
          const canvas3 = viewportCanvasRef.current;
          const ctx3 = viewportCtxRef.current;

          if (animRef.current == null || canvas3 == null || ctx3 == null) {
            return;
          }

          animRef.current.isExporting = true;
          animRef.current.isPlaying = false;
          animRef.current.currentFrameIndex = animRef.current.frameRange[0];

          const stream = canvas3.captureStream(animRef.current.metadata.fps);
          const recorder = new MediaRecorder(stream);

          console.log(stream);

          const interval = (1 / animRef.current.metadata.fps) * 1000;

          const chunks: Blob[] = [];

          // 3. Collect data as it becomes available
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          // 4. Handle the end of recording
          recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: "video/webm" });
            const url = URL.createObjectURL(blob);

            // Create a link to download the video
            const a = document.createElement("a");
            a.href = url;
            a.download = "recording.webm";
            a.click();

            if (animRef.current) animRef.current.isExporting = false;

            //   transcode();
          };

          recorder.start();

          const intervalId = setInterval(function () {
            if (animRef.current == null) {
              return;
            }

            if (
              animRef.current.currentFrameIndex > animRef.current.frameRange[1]
            ) {
              clearInterval(intervalId);
              recorder.stop();
            } else {
              renderScene(ctx3);
              animRef.current.currentFrameIndex++;
            }
          }, interval);
        },
        player: {
          setCurrentFrame,
          prevFrame: () => {
            if (animRef.current == null) return;

            setCurrentFrame(animRef.current.currentFrameIndex - 1);
          },
          nextFrame: () => {
            if (animRef.current == null) return;

            setCurrentFrame(animRef.current.currentFrameIndex + 1);
          },
        },
        history: {
          undo: () => {
            if (animRef.current == null) return;
            // undo

            const frame = getCurrentFrame();

            if (!frame) {
              return;
            }

            const popped = frame.animObjects.pop();

            if (popped) {
              animRef.current.history.push({
                type: "delete_frame",
                frame: frame,
                animObject: popped,
              });
            }
          },

          redo: () => {
            if (animRef.current == null) return;

            const popped = animRef.current.history.pop();

            console.log(popped);

            if (popped) {
              const frame = getCurrentFrame();

              if (frame) {
                console.log(frame);
                popped.frame.animObjects.push(popped.animObject);
              }
            }
          },
        },
        getTimeline() {
          if (animRef.current == null) return;

          console.log("Timeline History");

          const simplifiedLayers = [];

          const { layers } = animRef.current;
          for (let i = 0; i < layers.length; i++) {
            console.log(layers[i]);

            const layer = layers[i];

            const frameIndices: number[] = [];

            layer.frames.forEach((frame) => {
              frameIndices.push(frame.index);
            });

            simplifiedLayers.push(frameIndices);
          }

          console.log(simplifiedLayers);

          return simplifiedLayers;
        },
      }));

      return (
        <div ref={containerRef} className="stage">
          <canvas
            ref={stageCanvasRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onContextMenu={handleContextMenu}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          />
        </div>
      );
    },
  ),
);

Stage.displayName = "Stage";

export default Stage;

export type StageRef = {
    getLayerById: (id: string) => Layer | undefined;

  moveLayerDown: (layerIndex: number) => void;
  moveLayerUp: (layerIndex: number) => void;

  exportVideo: () => void;

  player: {
    setCurrentFrame: (frame: number) => void;
    prevFrame: () => void;
    nextFrame: () => void;
  };

  history: {
    undo: () => void;
    redo: () => void;
  };

  getTimeline: () => number[][] | undefined;
};
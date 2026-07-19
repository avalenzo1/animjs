"use client";

import MenuBar from "./components/MenuBar";
import Viewport from "./components/Stage";
import Image from "next/image";
import { ThemeContext } from "./ThemeContext";
import { useContext, useEffect, useState } from "react";
import ToolBar from "./components/Toolbar";
import ProgressBar from "./components/ProgressBar";
import { IconHandStop, IconBrush, IconBucketDroplet, IconEraser, IconEye, IconEyeClosed, IconLock, IconPlayerPause, IconPlayerPlay, IconLockOpen, IconPlus, IconFileImport, IconSelector, IconLayersSubtract } from "@tabler/icons-react";
import { E_Mode, Layer } from "./lib/Anim";

function SplashScreen() {
    return <div className="dialog-container">
        <div className="dialog dialog--show">
            <Image src="/anim.svg" alt="Anim logo. Also if you are disabled hi u are amazing!!! :D" width={256} height={256} unoptimized={true} />
            <div>
                <h1>Anim.JS</h1>
                <p>Version 1.0</p>
            </div>
            <hr />
            <ProgressBar progress={99} task={"Please wait..."} />
        </div>
    </div>;
}

export default function Home() {
    const { theme, setTheme } = useContext(ThemeContext);
    const [loading, setLoading] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [mode, setMode] = useState(E_Mode.BRUSH);
    const [layers, setLayers] = useState([new Layer("Layer 1")]);

    let model = [
    {
        icon: theme === "light" ? <Image src="/anim.svg" width={17} height={17} alt="Anim.JS logo" /> : <Image src="/animDark.svg" width={17} height={17} alt="Anim.JS logo" />,
        label: "Anim.JS",
        items: [
        {
            label: "Settings",
            action: () => {  }
        },
        {
            label: "Change Theme",
            action: () => { setTheme((prev) => prev === "light" ? "dark" : "light"); }
        },
        {
            label: "About",
            action: () => { alert("About") }
        }
        ]
    },
    {
        label: "File",
        items: [
        {
            label: "Open",
            action: () => { alert("Open") }
        },
        {
            label: "New",
            action: () => { console.log("new"); alert("New") }
        },
        {
            label: "Save",
            action: () => { alert("Save") }
        }
        ]
    }
    ];

    let toolsModel = [
        {
            label: "Hand",
            icon: <IconHandStop size={14} />,
            mode: E_Mode.HAND
        },
        {
            label: "Brush",
            icon: <IconBrush size={14} />,
            mode: E_Mode.BRUSH
        },
        {
            label: "Bucket",
            icon: <IconBucketDroplet size={14} />,
            mode: E_Mode.BUCKET
        },
        {
            label: "Eraser",
            icon: <IconEraser size={14} />,
            mode: E_Mode.ERASER
        },
    ];

    function handleModeChange(e: InputEvent) {
        setMode(e.target.value);
    }

    function toggleLock(id: string) {
        setLayers(layers.map((layer) => {
            if (id === layer.id) {
                layer.locked = !layer.locked;
            }

            return layer;
        }));
    }

    function toggleVisible(id: string) {
        setLayers(layers.map((layer) => {
            if (id === layer.id) {
                layer.visible = !layer.visible;
            }

            return layer;
        }));
    }

    function addLayer() {
        setLayers([...layers, new Layer("New Layer")]);
    }

    return <div id="app">
        <MenuBar items={model} />

        <div className="sidebar siderbar--left">
            <fieldset className="toolbar">
                <legend className="toolbar__header">Mode</legend>
                <div className="btn-group" role="group">
                    {toolsModel.map((tool, index) =>
                        <div key={index} className="btn-group__btn-check">
                            <input name="mode" value={tool.mode} type="radio" id={`${tool.label}-mode`} checked={tool.mode == mode} onChange={handleModeChange} />
                            <label htmlFor={`${tool.label}-mode`} className="btn btn--primary">
                                {tool.icon} {tool.label}
                            </label>
                        </div>
                    )}
                </div>
            </fieldset>
        </div>

        <Viewport onLoaded={() => setLoading(false)} layers={layers} />

        <div className="sidebar siderbar--right">

        </div>

        <div className="playbar">
            <button className="btn btn--primary" onClick={() => setPlaying(playing => !playing)}> {playing ? <IconPlayerPause size={12} /> : <IconPlayerPlay size={12} />}</button>
        </div>

        <div className="footer">
            <div className="flex h-full">
                <div className="flex flex-col border-r border-[color:var(--border-light)]">
                    <div className="p-3! b-2 border-b border-[color:var(--border-light)]">
                        Timeline
                    </div>

                    <div className="flex-1 overflow-scroll">
                        {layers.map((layer, index) => <div key={index} className="flex items-center cursor-grab pl-0! px-4! py-2! border-b border-[color:var(--border-light)] last:border-none">
                            
                            <IconSelector size={14} color="grey" />

                            <IconLayersSubtract size={14} className="mr-1!" />

                            <input defaultValue={layer.name} />

                            <div className="flex gap-2">
                                <button className="btn btn--primary" onClick={() => toggleLock(layer.id)}>
                                    {layer.locked ? <IconLock size={12} /> : <IconLockOpen size={12} />}
                                </button>
                            
                                <button className="btn btn--primary" onClick={() => toggleVisible(layer.id)}>
                                    {layer.visible ? <IconEye size={12} /> : <IconEyeClosed size={12} />}
                                </button>
                            </div>
                        </div>)}
                    </div>

                    <div className="flex justify-end gap-2 direction-end px-4! py-2! border-t border-[color:var(--border-light)]">
                        <button className="btn btn--primary"><IconFileImport size={12} /></button>
                        <button className="btn btn--primary" onClick={addLayer}><IconPlus size={12} /></button>
                    </div>
                </div>

                <div className="relative flex-grow">
                    <div className="player">
                        <div className="player__marker">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="18" viewBox="0 0 12 18" fill="none">
                                <path d="M11.5 0.5H0.5V12.5L6 16.5L11.5 12.5V0.5Z" fill="currentColor" stroke="currentColor"/>
                            </svg>
                        </div>
                        <div className="player__line" />
                    </div>
                </div>
            </div>
        </div>

        {loading && <SplashScreen />}
    </div>;
}
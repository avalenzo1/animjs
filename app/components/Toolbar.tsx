import { JSX } from "react";
import { E_Mode } from "../lib/Anim";

export type Tool = {
    label: string;
    icon: JSX.Element;
    mode: E_Mode;
};

export type ToolbarProps = {
    tools: Tool[];
    mode: E_Mode;
    setMode: (item: E_Mode) => void;
}

export default function Toolbar({ tools, mode, setMode }: ToolbarProps) {
    return <fieldset className="toolbar">
                <legend className="toolbar__header">Tools</legend>
                <div className="btn-group" role="group">
                    {tools.map((tool: Tool, index: number) =>
                        <div key={index} className="btn-group__btn-check">
                            <input name="mode" value={tool.mode} type="radio" id={`${tool.label}-mode`} checked={tool.mode == mode} onChange={() => setMode(tool.mode)} />
                            <label htmlFor={`${tool.label}-mode`} className="btn btn--primary">
                                {tool.icon} {tool.label}
                            </label>
                        </div>
                    )}
                </div>
            </fieldset>;
}
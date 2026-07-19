import { IconHandStop, IconBrush, IconBucketDroplet, IconEraser } from "@tabler/icons-react";

export default function Toolbar({ tools, mode, setMode }) {
    return <fieldset className="toolbar">
                <legend className="toolbar__header">Tools</legend>
                <div className="btn-group" role="group">
                    {tools.map((tool, index: number) =>
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
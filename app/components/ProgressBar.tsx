type ProgressBarProp = { progress: number, task: string };

export default function ProgressBar({ progress, task }: ProgressBarProp) {
    return <div>
        <span className="p-3 block">{task}</span>

        <div className="progress-bar progress-bar--primary">
            <div className="progress-bar__bar" style={{ width: `${Math.min(progress, 100)}%` }}></div>
        </div>
    </div>;
}
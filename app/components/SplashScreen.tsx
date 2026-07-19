import Image from "next/image";
import ProgressBar from "./ProgressBar";

export default function SplashScreen() {
    return (
        <div className="dialog-container">
            <div className="dialog dialog--show" style={{padding: 0}}>
                <Image
                    style={{backgroundColor: "var(--bg-main)"}}
                    src="/splash_screen.svg"
                    alt="Anim logo. Also if you are disabled hi u are amazing!!! :D"
                    width={700/1.5}
                    height={400/1.5}
                    unoptimized={true}
                />
                <div className="px-4 py-6">
                    <h1>Anim.JS</h1>
                    <p>v0.0.2 Alpha</p>
                    <p>Copyright &copy; 2026 All Rights Reserved</p>
                </div>
                <hr />
                <ProgressBar progress={100} task={"Please wait..."} />
            </div>
        </div>
    );
}
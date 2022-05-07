import React from "react";
import { homedir } from "os";
import * as cp from "child_process";
import { AppBase, AppsManager } from "@web-desktop-environment/app-sdk";
import { APIClient } from "@web-desktop-environment/server-api";
import http from "http";

interface VSCodeInput {
	process?: string;
	args?: string[];
	location?: string;
}

interface VSCodeState {
	port?: number;
	isLoaded: boolean;
	id?: string;
}

class VSCode extends AppBase<VSCodeInput, VSCodeState> {
	name = "vscode";
	state: AppBase<VSCodeInput, VSCodeState>["state"] = {
		isLoaded: false,
		useDefaultWindow: true,
		defaultWindowTitle: "vs-code",
	};

	vscode: cp.ChildProcessWithoutNullStreams;

	willUnmount = false;

	runVsCodeCli = (port: number, domain: string): void => {
		this.vscode = cp.fork(
			require.resolve("code-server/out/node/entry.js"),
			[
				`--port=${port}`,
				"--auth=none",
				"--host=0.0.0.0",
				process.cwd(),
			],
			{
				cwd: __dirname,
				stdio: ["ipc"],
				env: {
					PUBLIC_URL: `/${domain}/*/`,
				},
			}
		);
		this.vscode.on("message", (...e) => {
			console.log(...e);
		});
		APIClient.addChildProcess(this.vscode);
		const waitForVscodeToLoad = () => {
			if (!this.willUnmount) {
				http
					.get(`http://localhost:${port}/`, (res) => {
						this.setState({ isLoaded: true });
					})
					.on("error", (e) => {
						setTimeout(waitForVscodeToLoad, 100);
					});
			}
		};
		waitForVscodeToLoad();
	};

	componentWillUnmount = () => {
		this.willUnmount = true;
		this.vscode.kill();
	};

	componentDidMount = () => {
		this.api.portManager.withDomain().then(({ port, domain }) => {
			this.runVsCodeCli(port, domain);
			this.setState({ port, id: domain });
		});
	};

	renderApp: AppBase<VSCodeInput, VSCodeState>["renderApp"] = ({
		Iframe,
		LoadingScreen,
	}) => {
		const { id, isLoaded } = this.state;

		return id && isLoaded ? (
			<Iframe id={id} type="internal" />
		) : (
			<LoadingScreen message={"loading vs-code"} variant="jumpCube" />
		);
	};
}

export const registerApp = () =>
	AppsManager.registerApp({
		vscode: {
			displayName: "VS-Code",
			description: "full vscode editor",
			App: VSCode,
			defaultInput: { location: homedir() },
			icon: {
				type: "icon",
				icon: "VscCode",
			},
			color: "#219CF0",
			window: {
				height: 700,
				width: 1000,
				position: { x: 50, y: 50 },
				maxHeight: 7000,
				maxWidth: 7000,
				minWidth: 500,
				minHeight: 500,
				allowLocalScreenSnapping: true,
			},
		},
	});

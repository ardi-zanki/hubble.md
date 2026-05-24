import { useState } from "react";
import {
	disconnect,
	readConnection,
	saveWorkspace,
} from "./connection/connection";
import { ConnectScreen } from "./screens/ConnectScreen";
import { OpenWorkspaceScreen } from "./screens/OpenWorkspaceScreen";
import { AppShell } from "./shell/AppShell";

type Route =
	| { kind: "connect" }
	| { kind: "open-workspace"; url: string }
	| {
			kind: "shell";
			url: string;
			workspaceId: string;
			workspaceName: string;
	  };

function initialRoute(): Route {
	const stored = readConnection();
	if (!stored) return { kind: "connect" };
	if (!stored.workspaceId || !stored.workspaceName) {
		return { kind: "open-workspace", url: stored.url };
	}
	return {
		kind: "shell",
		url: stored.url,
		workspaceId: stored.workspaceId,
		workspaceName: stored.workspaceName,
	};
}

export default function App() {
	const [route, setRoute] = useState<Route>(initialRoute);

	const handleDisconnect = () => {
		disconnect();
		setRoute({ kind: "connect" });
	};

	if (route.kind === "connect") {
		return (
			<ConnectScreen
				onConnected={(url) => setRoute({ kind: "open-workspace", url })}
			/>
		);
	}

	if (route.kind === "open-workspace") {
		return (
			<OpenWorkspaceScreen
				url={route.url}
				onSelected={(workspaceId, workspaceName) =>
					setRoute({
						kind: "shell",
						url: route.url,
						workspaceId,
						workspaceName,
					})
				}
				onDisconnect={handleDisconnect}
			/>
		);
	}

	return (
		<AppShell
			key={`${route.url}:${route.workspaceId}`}
			url={route.url}
			workspaceId={route.workspaceId}
			workspaceName={route.workspaceName}
			onSwitch={(id, name) => {
				saveWorkspace(id, name);
				setRoute({
					kind: "shell",
					url: route.url,
					workspaceId: id,
					workspaceName: name,
				});
			}}
			onDisconnect={handleDisconnect}
		/>
	);
}

export function animateTabCollapse(
	strip: HTMLElement,
	target: HTMLElement,
): () => void {
	const tabs = [
		...strip.querySelectorAll<HTMLElement>(":scope > [data-tab-item]"),
	].reverse();
	if (
		window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
		!target.animate ||
		!tabs.length ||
		tabs.some((tab) => !tab.animate)
	) {
		return () => {};
	}

	const stripBounds = strip.getBoundingClientRect();
	const targetBounds = target.getBoundingClientRect();
	const targetX = targetBounds.left + targetBounds.width / 2;
	const targetY = targetBounds.top + targetBounds.height / 2;
	const bounds = tabs.map((tab) => tab.getBoundingClientRect());
	const stagger = Math.min(180, 1200 / Math.max(1, tabs.length - 1));
	const clipPath = strip.style.clipPath;
	const animations: Animation[] = [];

	// Keep departing tabs visible up to the button, without spilling left.
	strip.style.clipPath = `inset(-4px ${Math.min(0, stripBounds.right - targetX)}px -4px 0)`;
	for (const [index, tab] of tabs.entries()) {
		const rect = bounds[index];
		const x = targetX - (rect.left + rect.width / 2);
		const y = targetY - (rect.top + rect.height / 2);
		const delay = index * stagger;
		animations.push(
			tab.animate(
				[
					{ visibility: "visible", transform: "translate(0, 0) scale(1)" },
					{
						offset: 0.8,
						visibility: "visible",
						transform: `translate(${x * 0.9}px, ${y * 0.9}px) scale(0.85)`,
					},
					{
						visibility: "visible",
						transform: `translate(${x}px, ${y}px) scale(0)`,
					},
				],
				{
					duration: 500,
					delay,
					easing: "cubic-bezier(.2,.6,.35,1)",
					fill: "backwards",
				},
			),
			target.animate(
				[
					{ transform: "scale(1)", backgroundColor: "transparent" },
					{ transform: "scale(1.12)", backgroundColor: "var(--muted)" },
					{ transform: "scale(1)", backgroundColor: "transparent" },
				],
				{
					duration: Math.min(160, stagger),
					delay: delay + 500,
					easing: "ease-in-out",
				},
			),
		);
	}

	return () => {
		for (const animation of animations) animation.cancel();
		strip.style.clipPath = clipPath;
	};
}

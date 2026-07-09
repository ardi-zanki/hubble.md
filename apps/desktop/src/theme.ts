/**
 * Keeps the `dark` class on `<html>` in sync with the OS color scheme.
 */
export function initSystemTheme(): void {
	const query = window.matchMedia("(prefers-color-scheme: dark)");
	const apply = (isDark: boolean) => {
		document.documentElement.classList.toggle("dark", isDark);
	};
	apply(query.matches);
	query.addEventListener("change", (event) => apply(event.matches));
}

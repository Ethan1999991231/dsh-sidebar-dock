/**
 * Host half of dsh-sidebar-dock.
 *
 * The whole feature lives in the browser: the Client half relocates the frame's
 * sidebar lane with a package-owned stylesheet and adds one Settings row. The
 * Host half therefore only keeps the Loader row (and the plugin's inventory
 * identity) alive, and registers no Host resources.
 */
export function apply() {}

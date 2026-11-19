/**
 * Host half of the recent-tasks bundle.
 *
 * Every surface this plugin contributes lives in the browser: the sidebar
 * entry and the page are Client slots. The Host half therefore only has to
 * exist so the bundle patch can insert the plugin into the Host composition;
 * it registers no Service, no Tool, and reads no Host data.
 */
export function apply() {}

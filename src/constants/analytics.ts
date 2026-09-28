export const GA_MEASUREMENT_ID = 'G-07RYXQL1X0';

export const ANALYTICS_EVENTS = {
  PAGE_LOAD: 'page_load',
  UI_CLICK: 'ui_click',
  UI_INPUT: 'ui_input',
  UI_CHANGE: 'ui_change',
  UI_INTERACTION: 'ui_interaction',
  UI_EXPAND: 'ui_expand',
  FORM_SUBMIT: 'form_submit',
  CONTENT_SCROLL: 'content_scroll',
  ENVIRONMENT_BROWSER: 'environment_browser',
  ENVIRONMENT_DEVICE: 'environment_device',
  ENVIRONMENT_NETWORK: 'environment_network',
} as const;

export const ANALYTICS_ACTIONS = {
  SEARCH_OPEN: 'search_open',
  SEARCH_CLOSE: 'search_close',
  SEARCH_RESULT_ACTIVATE: 'search_result_activate',
  SEARCH_RESULTS_FOCUS: 'search_results_focus',
  MENU_CLOSE: 'menu_close',
  POST_NAVIGATE: 'post_navigate',
  GALLERY_NAVIGATE: 'gallery_navigate',
  GALLERY_CLOSE: 'gallery_close',
  COLOR_MODE_CHANGE: 'color_mode_change',
  DESIGN_CHANGE: 'design_change',
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
export type AnalyticsAction = (typeof ANALYTICS_ACTIONS)[keyof typeof ANALYTICS_ACTIONS];

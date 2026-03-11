/*!
 * MediaWiki dark mode detection composable for Vue 3 Composition API.
 *
 * Detects when the user has enabled dark mode via Vector skin preferences
 * (skin-theme-clientpref-night or skin-theme-clientpref-os with prefers-color-scheme: dark).
 * Sets up observers to react when the user toggles the theme.
 *
 * @see https://www.mediawiki.org/wiki/Manual:Dark_mode
 * @see https://gerrit.wikimedia.org/g/mediawiki/extensions/CodeMirror/+/571ed26b683868b9312d5df66713e546e9395862/resources/codemirror.js
 * @see https://gerrit.wikimedia.org/g/mediawiki/extensions/AbuseFilter/+/6719e77ec081932b6c88e3cbe05376768654b9b4/modules/ext.abuseFilter.edit.js
 *
 * @module ext.wikilambda.app.composables.useDarkMode
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { ref, onMounted, onUnmounted } = require( 'vue' );

/**
 * Detects if MediaWiki is in dark mode (forced night or OS preference).
 *
 * @memberof module:ext.wikilambda.app.composables.useDarkMode
 * @return {boolean}
 */
function detectDarkMode() {
	const html = document.documentElement;
	if ( html.classList.contains( 'skin-theme-clientpref-night' ) ) {
		return true;
	}
	if ( html.classList.contains( 'skin-theme-clientpref-os' ) ) {
		const mq = window.matchMedia && window.matchMedia( '(prefers-color-scheme: dark)' );
		return mq && mq.matches;
	}
	return false;
}

/**
 * MediaWiki dark mode composable.
 *
 * Provides a reactive isDarkMode ref that updates when the user toggles
 * the theme in Vector (or when OS preference changes with skin-theme-clientpref-os).
 *
 * @return {Object} Composable API with isDarkMode ref
 */
module.exports = function useDarkMode() {
	const isDarkMode = ref( detectDarkMode() );

	function updateDarkMode() {
		isDarkMode.value = detectDarkMode();
	}

	let mwThemeObserver = null;
	let colorSchemeMediaQuery = null;

	onMounted( () => {
		// Watch for MW dark mode changes (user toggles theme in Vector)
		mwThemeObserver = new MutationObserver( updateDarkMode );
		mwThemeObserver.observe( document.documentElement, {
			attributes: true,
			attributeFilter: [ 'class' ]
		} );

		// Watch for OS preference changes when using skin-theme-clientpref-os
		colorSchemeMediaQuery = window.matchMedia && window.matchMedia( '(prefers-color-scheme: dark)' );
		if ( colorSchemeMediaQuery ) {
			colorSchemeMediaQuery.addEventListener( 'change', updateDarkMode );
		}
	} );

	onUnmounted( () => {
		if ( mwThemeObserver ) {
			mwThemeObserver.disconnect();
		}
		if ( colorSchemeMediaQuery ) {
			colorSchemeMediaQuery.removeEventListener( 'change', updateDarkMode );
		}
	} );

	return {
		isDarkMode
	};
};

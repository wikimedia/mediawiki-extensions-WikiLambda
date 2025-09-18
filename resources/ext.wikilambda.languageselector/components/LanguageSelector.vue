<!--
	WikiLambda Vue interface module for selecting a page language.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		ref="languageSelector"
		class="ext-wikilambda-language-selector"
	>
		<cdx-button
			weight="quiet"
			aria-label="Toggle"
			class="ext-wikilambda-language-selector__trigger"
			@click="openLanguageSelector"
		>
			<cdx-icon :icon="iconLanguage"></cdx-icon>
			{{ selectedLanguageLabel }}
		</cdx-button>
		<div
			ref="languageSelectorDropdown"
			class="ext-wikilambda-language-selector__dropdown"
		>
			<cdx-lookup
				ref="languageSelectorLookup"
				:input-value="inputValue"
				class="ext-wikilambda-language-selector__lookup"
				:selected="selectedLanguage"
				:menu-items="lookupResults"
				:start-icon="iconSearch"
				:placeholder="selectLanguagePlaceholder"
				@update:input-value="onInput"
				@update:selected="onSelect"
			></cdx-lookup>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { CdxButton, CdxIcon, CdxLookup } = require( '../../codex.js' );
const icons = require( '../../lib/icons.json' );

module.exports = exports = defineComponent( {
	name: 'wl-language-selector',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'cdx-lookup': CdxLookup
	},
	data: function () {
		return {
			iconSearch: icons.cdxIconSearch,
			iconLanguage: icons.cdxIconLanguage,
			inputValue: '',
			lookupDelayTimer: null,
			lookupDelayMs: 300,
			lookupResults: [],
			maxItems: 10,
			selectedLanguage: null
		};
	},
	computed: {
		/**
		 * Returns the language iso code for the current selected language.
		 *
		 * @return {string}
		 */
		selectedLanguageCode: function () {
			return mw.config.get( 'wgUserLanguage' );
		},

		/**
		 * Returns the language name for the current selected language.
		 *
		 * @return {string}
		 */
		selectedLanguageLabel: function () {
			return mw.config.get( 'wgUserLanguageName' );
		},

		/**
		 * Returns the placeholder text for the global language
		 * selector
		 *
		 * @return {string}
		 */
		selectLanguagePlaceholder: function () {
			return this.$i18n( 'wikilambda-about-widget-search-language-placeholder' ).text();
		},

		/**
		 * Returns the current Uri path
		 *
		 * @return {string}
		 */
		currentPath: function () {
			return window.location.pathname;
		},

		/**
		 * Returns whether the current path is a wikilambda
		 * /view/<lang>/<zid> content path
		 *
		 * @return {boolean}
		 */
		isViewPath: function () {
			return /^\/view\/.*\/.*$/.test( this.currentPath );
		}
	},
	methods: {
		/**
		 * Triggers the language lookup and redirects to the
		 * new language page for the given language code
		 *
		 * @param {string} input
		 */
		onInput: function ( input ) {
			this.inputValue = input;

			// If input is empty, reset lookupResults
			if ( !input ) {
				this.lookupResults = [];
				return;
			}

			// Search after 300 ms
			clearTimeout( this.lookupDelayTimer );
			this.lookupDelayTimer = setTimeout( () => {
				this.fetchLookupResults( input );
			}, this.lookupDelayMs );
		},

		/**
		 * Performs the languageinfo fetch and filters
		 * the returned results for the lookup component
		 *
		 * @param {string} input - The search input to filter languages
		 */
		fetchLookupResults: function ( input ) {
			const api = new mw.Api();
			api.get( {
				action: 'query',
				format: 'json',
				uselang: this.selectedLanguageCode,
				meta: 'languageinfo',
				formatversion: '2',
				liprop: 'code|name|autonym'
			} ).then( ( data ) => {
				if ( ( 'query' in data ) && ( 'languageinfo' in data.query ) ) {
					// Filter items that match the input substring
					const matchedLangs = Object.keys( data.query.languageinfo )
						.map( ( key ) => data.query.languageinfo[ key ] )
						.filter( ( result ) => result.name.toLowerCase().includes( input.toLowerCase() ) ||
								result.autonym.toLowerCase().includes( input.toLowerCase() ) ||
								result.code.toLowerCase().includes( input.toLowerCase() ) );
					// Limit lookup reults to maxItems
					this.setLookupResults( matchedLangs.slice( 0, this.maxItems ) );
				}
			} );
		},

		/**
		 * Sets the menu items for the lookup component
		 * with the filtered results
		 *
		 * @param {Array} results
		 */
		setLookupResults: function ( results ) {
			this.lookupResults = [];

			// Update lookupResults list
			if ( results && results.length > 0 ) {
				results.forEach( ( result ) => {
					const value = result.code;
					const label = result.name;
					this.lookupResults.push( { value, label } );
				} );
			}
		},

		/**
		 * Returns the new Uri path given a selected language code
		 *
		 * @param {string} languageCode
		 * @return {string}
		 */
		getNewLanguagePath: function ( languageCode ) {
			// Either we are in /view/<lang>/zid and replace the lang url section...
			if ( this.isViewPath ) {
				const pathParts = this.currentPath.split( '/' );
				pathParts[ 2 ] = languageCode;
				return pathParts.join( '/' );
			}
			// ... or we have to set or replace uselang=lang using native URL API
			const url = new URL( window.location.href );
			url.searchParams.set( 'uselang', languageCode );
			return url.pathname + url.search;
		},

		/**
		 * Redirects to the current page in the specified language
		 *
		 * @param {string} languageCode
		 */
		redirectToLanguagePage: function ( languageCode ) {
			const targetUrl = this.getNewLanguagePath( languageCode );
			window.location.href = targetUrl;
		},

		/**
		 * On language selection, we find out the language Code that coresponds
		 * to the selected Zid, we fetch it if it's still not available in the
		 * store, and once we have it, we navigate to the new page
		 *
		 * @param {string} languageCode
		 */
		onSelect: function ( languageCode ) {
			// T374246: update:selected events are emitted with null value
			// whenever input changes, so we need to exit early whenever
			// selected value is null, instead of setting the value to empty
			// for now. When Codex fixes this issue, we'll be able to remove
			// the following lines and restore the clear behavior.
			if ( languageCode === null ) {
				return;
			}

			this.closeLanguageSelector();

			// If the language Zid is empty or the same as the current one, we pass
			if ( !languageCode || ( this.selectedLanguageCode === languageCode ) ) {
				return;
			}

			// We make sure that we know the corresponding language code before navigating out
			this.redirectToLanguagePage( languageCode );
		},

		/**
		 * Closes the language selector dropdown
		 */
		closeLanguageSelector: function () {
			// Hide dropdown
			const dropdown = this.$refs.languageSelectorDropdown;
			$( dropdown ).removeClass( 'ext-wikilambda-language-selector__dropdown--visible' );
		},

		/**
		 * Opens the language selector dropdown
		 */
		openLanguageSelector: function () {
			// Display dropdown
			const dropdown = this.$refs.languageSelectorDropdown;
			$( dropdown ).addClass( 'ext-wikilambda-language-selector__dropdown--visible' );
			// Focus selector
			// eslint-disable-next-line no-jquery/variable-pattern
			const lookup = this.$refs.languageSelectorLookup.$el;
			try {
				// Get input element from cdx-lookup->cdx-text-input->input
				// Wrap in try catch to avoid throwing errors in case of codex changes
				const input = lookup.firstChild.firstChild;
				input.focus();
			} catch ( e ) {
				return;
			}
		},

		/**
		 * Event handler to close the language selector
		 * dropdown if user clicks outside of the language
		 * selector section
		 *
		 * @param {Object} e
		 */
		handleClick: function ( e ) {
			const parent = this.$refs.languageSelector;
			if ( e.target !== parent && !parent.contains( e.target ) ) {
				this.closeLanguageSelector();
			}
		}
	},
	mounted: function () {
		window.addEventListener( 'click', this.handleClick );
	},
	beforeUnmount: function () {
		window.removeEventListener( 'click', this.handleClick );
	}
} );
</script>

<style lang="less">
.ext-wikilambda-language-selector {
	position: relative;

	&__dropdown {
		position: absolute;
		right: 0;
		display: none;

		&--visible {
			display: block;
		}
	}
}
</style>

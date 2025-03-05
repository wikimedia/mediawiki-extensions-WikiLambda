/**
 * WikiLambda Vue editor: Page Title Mixin
 * Mixin with functions to change page titles outside Vue scope
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mapState } = require( 'pinia' );

const useMainStore = require( '../store/index.js' );
const { getZMonolingualLangValue } = require( '../utils/zobjectUtils.js' );

module.exports = exports = {
	data: function () {
		return {
			pageTitleObject: {}
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getFallbackLanguageZids',
		'getLabelData',
		'getLanguageIsoCodeOfZLang',
		'getUserLangZid',
		'getZObjectByKeyPath',
		'getZPersistentName'
	] ) ),
	methods: {
		/**
		 * Update the page title and language chip based on the provided data.
		 * - First construct a new page title object based on the provided name.
		 * - Then update the DOM elements of page title and language chip based on the new object.
		 */
		updatePageTitle: function () {
			this.updatePageTitleObject();
			this.updatePageTitleElements();
		},
		/**
		 * Update the DOM elements of page title and language chip based on the provided data
		 * - page title: update the page title with the provided title
		 * - language chip: update the language chip with the provided language code
		 */
		updatePageTitleElements: function () {
			// eslint-disable-next-line no-jquery/no-global-selector
			const $firstHeading = $( '#firstHeading' );
			const $langChip = $firstHeading.find( '.ext-wikilambda-editpage-header__bcp47-code-name' );
			const $pageTitle = $firstHeading.find( '.ext-wikilambda-editpage-header__title--function-name' ).first();
			// Update the title
			$pageTitle
				.toggleClass( 'ext-wikilambda-editpage-header__title--untitled', !this.pageTitleObject.title )
				.text( this.pageTitleObject.title || this.$i18n( 'wikilambda-editor-default-name' ).text() );
			// Update the language chip
			$langChip
				.toggleClass( 'ext-wikilambda-editpage-header__bcp47-code--hidden', !this.pageTitleObject.hasChip )
				.text( this.pageTitleObject.chip )
				.attr( 'data-title', this.pageTitleObject.chipName );
		},
		/**
		 * Update the page title object based on the provided name;
		 * - Is there a title in my language?
		 *   - Yes: { title: "Title", hasChip: false }
		 *   - No: for each lang in fallback languages [ "A", "B", "C" ], check:
		 *     - Is there a title in a fallback language?
		 *       - Yes: { title: "Title", hasChip: true }
		 *       - No: { title: null, hasChip: false }
		 * Finally update the title DOM elements to reflect the new state.
		 */
		updatePageTitleObject: function () {
			const name = this.getZPersistentName( this.getUserLangZid );
			this.pageTitleObject = this.pageTitleObject || {};
			// Is there a title in my language?
			if ( name ) {
				// Yes
				this.setPageTitleObject( name, false );
			} else {
				// No
				const fallbackLanguages = this.getFallbackLanguageZids
					.slice( this.getFallbackLanguageZids.indexOf( this.getUserLangZid ) + 1 );
				// Is there a title in a fallback language?
				const hasTitle = fallbackLanguages.some( ( lang ) => {
					const fallbackName = this.getZPersistentName( lang );
					// Yes, title in a fallback language
					if ( fallbackName ) {
						this.setPageTitleObject( fallbackName, true );
						return true;
					}
					// No, no title available in a fallback language
					return false;
				} );
				// No title available in any language
				if ( !hasTitle ) {
					this.setPageTitleObject( null, false );
				}
			}
		},
		/**
		 * Set the page title object based on the provided name object and chip flag
		 *
		 * @param {Object} name - terminal value to set as a title, contains value and keyPath
		 * @param {boolean} hasChip - flag to indicate if the language chip should be displayed
		 */
		setPageTitleObject: function ( name, hasChip ) {
			if ( name ) {
				const parentKeyPath = name.keyPath.split( '.' ).slice( 0, -2 );
				const monolingual = this.getZObjectByKeyPath( parentKeyPath );
				const langZid = getZMonolingualLangValue( monolingual );
				const langCode = this.getLanguageIsoCodeOfZLang( langZid );
				this.pageTitleObject.title = name.value;
				this.pageTitleObject.hasChip = hasChip;
				this.pageTitleObject.chip = langCode;
				this.pageTitleObject.chipName = this.getLabelData( langZid ).label;
			} else {
				this.pageTitleObject.title = null;
				this.pageTitleObject.hasChip = false;
				this.pageTitleObject.chip = null;
				this.pageTitleObject.chipName = null;
			}
		}
	}
};

/*!
 * Page Title composable for Vue 3 Composition API.
 * Provides functions to change page titles outside Vue scope
 *
 * @module ext.wikilambda.app.composables.usePageTitle
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { inject, ref } = require( 'vue' );
const { storeToRefs } = require( 'pinia' );
const useMainStore = require( '../store/index.js' );
const { getZMonolingualLangValue } = require( '../utils/zobjectUtils.js' );

/**
 * Page Title composable
 *
 * @return {Object} Page Title composable API
 */
module.exports = function usePageTitle() {
	const i18n = inject( 'i18n' );
	const pageTitleObject = ref( {} );

	const mainStore = useMainStore();
	const {
		getFallbackLanguageZids,
		getLabelData,
		getLanguageIsoCodeOfZLang,
		getUserLangZid,
		getZObjectByKeyPath,
		getZPersistentName
	} = storeToRefs( mainStore );

	/**
	 * Update the page title and language chip based on the provided data.
	 * - First construct a new page title object based on the provided name.
	 * - Then update the DOM elements of page title and language chip based on the new object.
	 */
	function updatePageTitle() {
		updatePageTitleObject();
		updatePageTitleElements();
	}

	/**
	 * Update the DOM elements of page title and language chip based on the provided data
	 * - page title: update the page title with the provided title
	 * - language chip: update the language chip with the provided language code
	 */
	function updatePageTitleElements() {
		// eslint-disable-next-line no-jquery/no-global-selector
		const $firstHeading = $( '#firstHeading' );
		const $langChip = $firstHeading.find( '.ext-wikilambda-editpage-header__bcp47-code-name' );
		const $pageTitle = $firstHeading.find( '.ext-wikilambda-editpage-header__title--function-name' ).first();
		// Update the title
		$pageTitle
			.toggleClass( 'ext-wikilambda-editpage-header__title--untitled', !pageTitleObject.value.title )
			.text( pageTitleObject.value.title || i18n( 'wikilambda-editor-default-name' ).text() );
		// Update the language chip
		$langChip
			.toggleClass( 'ext-wikilambda-editpage-header__bcp47-code--hidden', !pageTitleObject.value.hasChip )
			.text( pageTitleObject.value.chip )
			.attr( 'data-title', pageTitleObject.value.chipName );
	}

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
	function updatePageTitleObject() {
		const name = getZPersistentName.value( getUserLangZid.value );
		pageTitleObject.value = pageTitleObject.value || {};
		// Is there a title in my language?
		if ( name ) {
			// Yes
			setPageTitleObject( name, false );
		} else {
			// No
			const fallbackLanguages = getFallbackLanguageZids.value
				.slice( getFallbackLanguageZids.value.indexOf( getUserLangZid.value ) + 1 );
			// Is there a title in a fallback language?
			const hasTitle = fallbackLanguages.some( ( lang ) => {
				const fallbackName = getZPersistentName.value( lang );
				// Yes, title in a fallback language
				if ( fallbackName ) {
					setPageTitleObject( fallbackName, true );
					return true;
				}
				// No, no title available in a fallback language
				return false;
			} );
			// No title available in any language
			if ( !hasTitle ) {
				setPageTitleObject( null, false );
			}
		}
	}

	/**
	 * Set the page title object based on the provided name object and chip flag
	 *
	 * @param {Object} name - terminal value to set as a title, contains value and keyPath
	 * @param {boolean} hasChip - flag to indicate if the language chip should be displayed
	 */
	function setPageTitleObject( name, hasChip ) {
		if ( name ) {
			const parentKeyPath = name.keyPath.split( '.' ).slice( 0, -2 );
			const monolingual = getZObjectByKeyPath.value( parentKeyPath );
			const langZid = getZMonolingualLangValue( monolingual );
			const langCode = getLanguageIsoCodeOfZLang.value( langZid );
			pageTitleObject.value.title = name.value;
			pageTitleObject.value.hasChip = hasChip;
			pageTitleObject.value.chip = langCode;
			pageTitleObject.value.chipName = getLabelData.value( langZid ).label;
		} else {
			pageTitleObject.value.title = null;
			pageTitleObject.value.hasChip = false;
			pageTitleObject.value.chip = null;
			pageTitleObject.value.chipName = null;
		}
	}

	/**
	 * Set the page title for the Special:CreateAbstract page when the item is selected
	 *
	 * @param {string} qid
	 */
	function setCreateAbstractTitle( qid ) {
		// eslint-disable-next-line no-jquery/no-global-selector
		const $firstHeading = $( '#firstHeading' );
		$firstHeading.text( i18n( 'wikilambda-abstract-special-create-qid' ).params( [ qid ] ).text() );
	}

	return {
		pageTitleObject,
		getFallbackLanguageZids,
		getLabelData,
		getLanguageIsoCodeOfZLang,
		getUserLangZid,
		getZObjectByKeyPath,
		getZPersistentName,
		updatePageTitle,
		updatePageTitleElements,
		updatePageTitleObject,
		setPageTitleObject,
		setCreateAbstractTitle
	};
};

/*!
 * Page Title composable for Vue 3 Composition API.
 * Provides functions to change page titles outside Vue scope
 *
 * @module ext.wikilambda.app.composables.usePageTitle
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { inject } = require( 'vue' );
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
	 * Build a title data object from a resolved name terminal value.
	 *
	 * @param {Object} name - terminal value containing keyPath and value
	 * @param {boolean} hasChip
	 * @return {{title: string, hasChip: boolean, chip: string, chipName: string}}
	 */
	function buildTitleData( name, hasChip ) {
		const parentKeyPath = name.keyPath.split( '.' ).slice( 0, -2 );
		const monolingual = getZObjectByKeyPath.value( parentKeyPath );
		const langZid = getZMonolingualLangValue( monolingual );
		const langCode = getLanguageIsoCodeOfZLang.value( langZid );
		return {
			title: name.value,
			hasChip,
			chip: langCode,
			chipName: getLabelData.value( langZid ).label
		};
	}

	/**
	 * Resolve the best available title data for the current ZObject:
	 * - user language label if available
	 * - first fallback language label (with chip) if available
	 * - null title with no chip when untitled
	 *
	 * @return {{title: string|null, hasChip: boolean, chip: string|null, chipName: string|null}}
	 */
	function resolveTitleData() {
		const name = getZPersistentName.value( getUserLangZid.value );
		if ( name ) {
			return buildTitleData( name, false );
		}
		const fallbackLanguages = getFallbackLanguageZids.value
			.slice( getFallbackLanguageZids.value.indexOf( getUserLangZid.value ) + 1 );
		for ( const lang of fallbackLanguages ) {
			const fallbackName = getZPersistentName.value( lang );
			if ( fallbackName ) {
				return buildTitleData( fallbackName, true );
			}
		}
		return { title: null, hasChip: false, chip: null, chipName: null };
	}

	/**
	 * Update the ZObject edit-page heading and language chip in the DOM.
	 */
	function updateZObjectPageTitle() {
		const titleData = resolveTitleData();
		// eslint-disable-next-line no-jquery/no-global-selector
		const $firstHeading = $( '#firstHeading' );
		const $pageTitle = $firstHeading.find( '.ext-wikilambda-editpage-header__title--function-name' ).first();
		const $langChip = $firstHeading.find( '.ext-wikilambda-editpage-header__bcp47-code-name' );
		$pageTitle
			.toggleClass( 'ext-wikilambda-editpage-header__title--untitled', !titleData.title )
			.text( titleData.title || i18n( 'wikilambda-editor-default-name' ).text() );
		$langChip
			.toggleClass( 'ext-wikilambda-editpage-header__bcp47-code--hidden', !titleData.hasChip )
			.text( titleData.chip )
			.attr( 'data-title', titleData.chipName );
	}

	/**
	 * Update the Special:CreateAbstract page heading once a Wikidata entity is selected.
	 * PHP has already rendered the editpage-header wrapper with a title span; this function
	 * updates that span's text (using the label when available) and finds or creates the
	 * copyable QID chip span, mirroring the structure PHP builds for the pre-selected case.
	 *
	 * @param {string} qid
	 * @param {string} [label]
	 */
	function updateAbstractPageTitle( qid, label ) {
		// eslint-disable-next-line no-jquery/no-global-selector
		const $firstHeading = $( '#firstHeading' );
		const titleText = i18n( 'wikilambda-abstract-special-create-qid' ).params( [ label || qid ] ).text();

		$firstHeading.find( '.ext-wikilambda-editpage-header__title' ).text( titleText );

		let $qidSpan = $firstHeading.find( '.ext-wikilambda-editpage-header__qid' );
		if ( !$qidSpan.length ) {
			$qidSpan = $( '<span>' )
				.addClass( 'ext-wikilambda-editpage-header__qid' )
				.attr( { role: 'button', tabindex: '0', 'aria-live': 'polite' } );
			$firstHeading.find( '.ext-wikilambda-editpage-header' ).append( ' ', $qidSpan );
		}
		$qidSpan.text( qid );
	}

	return { updateZObjectPageTitle, updateAbstractPageTitle };
};

/*!
 * Publish composable for Vue 3 Composition API.
 * Handles the Publish button state and the steps before the publish dialog
 * opens, which are the same for ZObjects and Abstract content.
 *
 * @module ext.wikilambda.app.composables.usePublish
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { computed, ref } = require( 'vue' );
const Constants = require( '../Constants.js' );
const useMainStore = require( '../store/index.js' );

/**
 * Composable for the Publish button and the publish dialog state.
 *
 * @param {Object} options
 * @param {function(): boolean} options.validate - Clears old errors and validates the content;
 *   returns true if the content can be published
 * @param {function(): void} [options.onPublishStart] - Optional callback invoked when the
 *   publish dialog opens (e.g. for event logging)
 * @return {Object} Composable API with showPublishDialog, closePublishDialog, initialSummary,
 *   revertToEdit, waitAndHandlePublish
 */
module.exports = function usePublish( { validate, onPublishStart } ) {
	const store = useMainStore();
	const showPublishDialog = ref( false );

	/**
	 * If 'oldid' exists in the query (and is not empty), or the server loaded the
	 * content of an undo request, return true.
	 * If true, this enables the Publish button without needing an event.
	 *
	 * @return {boolean}
	 */
	const revertToEdit = computed( () => !store.isCreateNewPage && (
		( store.getQueryParams && typeof store.getQueryParams.oldid === 'string' && store.getQueryParams.oldid.trim() !== '' ) ||
		// (T335713) A failed undo loads the current revision, so it must not enable Publish.
		!!store.getWikilambdaConfig.undo
	) );

	/**
	 * The edit summary to start with: core's undo summary, if the undo content loaded.
	 *
	 * @return {string}
	 */
	const initialSummary = computed( () => {
		const { undo } = store.getWikilambdaConfig;
		return ( undo && undo.summary ) || '';
	} );

	function closePublishDialog() {
		showPublishDialog.value = false;
	}

	/**
	 * Add a publish dialog warning if there are empty Z9K1/references.
	 */
	function raisePublishWarnings() {
		const hasEmptyRefs = store.getErrorPaths.some( ( errorId ) => store.getErrors( errorId )
			.some( ( error ) => error.messageKey === 'wikilambda-empty-reference-warning' ) );

		if ( hasEmptyRefs ) {
			store.setError( {
				errorId: Constants.STORED_OBJECTS.MAIN,
				errorMessageKey: 'wikilambda-empty-references-publish-warning',
				errorType: Constants.ERROR_TYPES.WARNING
			} );
		}
	}

	/**
	 * Open the publish dialog if the content is valid.
	 */
	function handlePublish() {
		if ( validate() ) {
			raisePublishWarnings();
			if ( onPublishStart ) {
				onPublishStart();
			}
			showPublishDialog.value = true;
		}
	}

	/**
	 * Waits for running parsers to return and persist
	 * changes before going ahead with the publish.
	 */
	function waitAndHandlePublish() {
		store.waitForRunningParsers.then( () => handlePublish() );
	}

	return {
		closePublishDialog,
		initialSummary,
		revertToEdit,
		showPublishDialog,
		waitAndHandlePublish
	};
};

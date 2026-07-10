/*!
 * Error handling composable for Vue 3 Composition API.
 * Provides functions to handle component errors
 *
 * @module ext.wikilambda.app.composables.useError
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { computed, toValue } = require( 'vue' );
const { storeToRefs } = require( 'pinia' );
const Constants = require( '../Constants.js' );
const useMainStore = require( '../store/index.js' );

/**
 * Error handling composable
 *
 * @param {Object} options - Options object
 * @param {string|Function|Object} options.keyPath - The component keyPath, as a
 *   plain string, a ref, or a getter. Read reactively via `toValue` so that the
 *   error getters track a component's keyPath prop when it changes (e.g. when a
 *   list-item instance is relocated on reorder).
 * @return {Object} Error composable API
 */
module.exports = function useError( { keyPath } = {} ) {
	const mainStore = useMainStore();
	const { clearErrors } = mainStore;
	const { getChildErrorKeys, getErrors, getErrorPaths } = storeToRefs( mainStore );

	/**
	 * If keyPath is associated to a field (is defined and
	 * not at the root level), clear the errors associated to this
	 * component.
	 */
	function clearFieldErrors() {
		const keyPathValue = toValue( keyPath );
		if ( keyPathValue && keyPathValue !== Constants.STORED_OBJECTS.MAIN ) {
			clearErrors( keyPathValue );
		}
	}

	/**
	 * Returns the errors of the component keyPath.
	 *
	 * @return {Array}
	 */
	const fieldErrors = computed( () => {
		const keyPathValue = toValue( keyPath );
		return keyPathValue && keyPathValue !== Constants.STORED_OBJECTS.MAIN ?
			getErrors.value( keyPathValue ) :
			[];
	} );

	/**
	 * Returns whether the component is in an error state.
	 *
	 * @return {boolean}
	 */
	const hasFieldErrors = computed( () => fieldErrors.value.length > 0 );

	/**
	 * Returns whether there are any errors stored
	 * for any child fields of this field.
	 *
	 * @return {boolean}
	 */
	const hasChildErrors = computed( () => {
		const keyPathValue = toValue( keyPath );
		return keyPathValue ?
			getChildErrorKeys.value( keyPathValue ).length > 0 :
			false;
	} );

	return {
		getChildErrorKeys,
		getErrors,
		getErrorPaths,
		clearFieldErrors,
		fieldErrors,
		hasFieldErrors,
		hasChildErrors
	};
};
